import fnmatch

from django.core.cache.backends.locmem import LocMemCache


class PatternLocMemCache(LocMemCache):
    """A local test cache with the pattern-deletion API used by django-redis."""

    def delete_pattern(self, pattern, version=None):
        matching_keys = [
            key for key in self._cache if fnmatch.fnmatch(key, f"*{pattern}")
        ]
        for key in matching_keys:
            del self._cache[key]
            self._expire_info.pop(key, None)
        return len(matching_keys)
