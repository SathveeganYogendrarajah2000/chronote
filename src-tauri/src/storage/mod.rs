//! Storage and atomic filesystem persistence module for Chronote.
//!
//! Follows the atomic write protocol:
//! 1. Write to temporary file (.tmp)
//! 2. Flush OS buffers via File::sync_all()
//! 3. Atomic rename to target path.
