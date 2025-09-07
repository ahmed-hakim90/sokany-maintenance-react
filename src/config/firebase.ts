// Temporary compatibility layer: export a Firebase-like interface backed by Supabase
// This allows an incremental migration from Firebase APIs to Supabase.
import adapter from './supabaseAdapter';

export const db = adapter.db;
export const auth = adapter.auth;

export default adapter;
