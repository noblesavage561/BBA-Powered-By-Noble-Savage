"""Pytest configuration for backend tests."""
import os
import sys

# Ensure the backend package root is importable.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
