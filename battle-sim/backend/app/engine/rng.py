"""Deterministic seeded Pseudo-Random Number Generator (Mulberry32)."""

class SeededRNG:
    """Mulberry32 32-bit generator producing identical sequences given the same seed."""

    def __init__(self, seed: int = 1000):
        self.seed = int(seed)
        self.state = int(seed) & 0xFFFFFFFF

    def reset(self, seed: int | None = None) -> None:
        if seed is not None:
            self.seed = int(seed)
        self.state = self.seed & 0xFFFFFFFF

    def next_int(self) -> int:
        self.state = (self.state + 0x6D2B79F5) & 0xFFFFFFFF
        z = self.state
        z = ((z ^ (z >> 15)) * (z | 1)) & 0xFFFFFFFF
        z ^= (z + (((z ^ (z >> 7)) * (z | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return (z ^ (z >> 14)) & 0xFFFFFFFF

    def next_float(self) -> float:
        return self.next_int() / 4294967296.0

    def randint(self, a: int, b: int) -> int:
        if a > b:
            a, b = b, a
        span = (b - a) + 1
        val = a + int(self.next_float() * span)
        return min(b, max(a, val))

    def random(self) -> float:
        return self.next_float()

    def choice(self, seq):
        if not seq:
            raise IndexError("Cannot choose from empty sequence")
        idx = self.randint(0, len(seq) - 1)
        return seq[idx]

    def shuffle(self, seq: list) -> None:
        for i in range(len(seq) - 1, 0, -1):
            j = self.randint(0, i)
            seq[i], seq[j] = seq[j], seq[i]
