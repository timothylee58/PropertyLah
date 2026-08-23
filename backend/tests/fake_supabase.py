"""A tiny stand-in for the supabase-py query builder, shared by tests that need
`select().eq().order().range()/.limit()`, `insert()`, `update()`, and `upsert()`
to actually behave like a table instead of always returning the same rows.
"""

import uuid


class FakeResult:
    def __init__(self, data: list[dict], count: int | None = None):
        self.data = data
        self.count = count


class FakeQuery:
    def __init__(self, rows: list[dict]):
        self.rows = rows  # same list object as FakeDb.tables[name] — mutate in place
        self.op = "select"
        self.payload: dict | None = None
        self.on_conflict: str | None = None
        self.filters: list = []  # list of (row) -> bool predicates
        self._count = None
        self._order = None
        self._range = None
        self._limit = None

    # -- builder methods --------------------------------------------------
    def select(self, *args, **kwargs) -> "FakeQuery":
        self.op = "select"
        self._count = kwargs.get("count")
        return self

    def insert(self, row: dict) -> "FakeQuery":
        self.op = "insert"
        self.payload = row
        return self

    def update(self, patch: dict) -> "FakeQuery":
        self.op = "update"
        self.payload = patch
        return self

    def upsert(self, row: dict, on_conflict: str | None = None) -> "FakeQuery":
        self.op = "upsert"
        self.payload = row
        self.on_conflict = on_conflict
        return self

    def eq(self, column: str, value) -> "FakeQuery":
        self.filters.append(lambda row, c=column, v=value: str(row.get(c)) == str(v))
        return self

    def ilike(self, column: str, pattern: str) -> "FakeQuery":
        # supabase-py passes SQL LIKE syntax ("%text%"); this only needs to
        # support the "%substring%" shape listings_service.py actually sends
        needle = pattern.strip("%").lower()
        self.filters.append(lambda row, c=column, n=needle: n in str(row.get(c, "")).lower())
        return self

    def lte(self, column: str, value) -> "FakeQuery":
        self.filters.append(lambda row, c=column, v=value: row.get(c) is not None and row[c] <= v)
        return self

    def order(self, column: str, desc: bool = False) -> "FakeQuery":
        self._order = (column, desc)
        return self

    def limit(self, n: int) -> "FakeQuery":
        self._limit = n
        return self

    def range(self, start: int, end: int) -> "FakeQuery":
        self._range = (start, end)
        return self

    def single(self) -> "FakeQuery":
        return self

    # -- execution ----------------------------------------------------------
    def _matches(self, row: dict) -> bool:
        return all(predicate(row) for predicate in self.filters)

    def execute(self) -> FakeResult:
        if self.op == "insert":
            row = {**self.payload}
            row.setdefault("id", str(uuid.uuid4()))
            row.setdefault("created_at", "2026-01-01T00:00:00+00:00")
            self.rows.append(row)
            return FakeResult([row])

        if self.op == "update":
            updated = []
            for row in self.rows:
                if self._matches(row):
                    row.update(self.payload)
                    updated.append(row)
            return FakeResult(updated)

        if self.op == "upsert":
            existing = None
            if self.on_conflict:
                existing = next(
                    (r for r in self.rows if r.get(self.on_conflict) == self.payload.get(self.on_conflict)),
                    None,
                )
            if existing is not None:
                existing.update(self.payload)
                return FakeResult([existing])
            row = {**self.payload}
            row.setdefault("id", str(uuid.uuid4()))
            self.rows.append(row)
            return FakeResult([row])

        # select
        rows = [row for row in self.rows if self._matches(row)]
        if self._order:
            column, desc = self._order
            rows = sorted(rows, key=lambda r: r.get(column) or "", reverse=desc)
        total = len(rows)
        if self._range:
            start, end = self._range
            rows = rows[start:end + 1]
        elif self._limit is not None:
            rows = rows[: self._limit]
        return FakeResult(rows, count=total if self._count else None)


class FakeDb:
    def __init__(self, tables: dict[str, list[dict]] | None = None):
        self.tables: dict[str, list[dict]] = tables or {}

    def table(self, name: str) -> FakeQuery:
        self.tables.setdefault(name, [])
        return FakeQuery(self.tables[name])
