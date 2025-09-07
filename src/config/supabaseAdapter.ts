// A thin adapter to map commonly-used Firebase-like helpers to Supabase equivalents.
// This keeps the rest of the app working with minimal changes while we migrate calls incrementally.

import supabase from './supabase';
import { supabase as sb } from './supabase';

// NOTE: This adapter provides a minimal set of helpers used in the codebase.
// It is not a full replacement for Firestore. For complex queries/mutations, migrate components
// to use `sb` directly (recommended after this initial phase).

export const auth = {
  async createUserWithEmailAndPassword(email: string, password: string) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async signInWithEmailAndPassword(email: string, password: string) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    return true;
  }
};

// Firestore-like helpers (very small subset)
export const db = {
  async getDocs(table: string, opts: any = {}) {
    // opts: { eq?: { field, value }, orderBy?: { field, ascending }, limit }
    let query = sb.from(table).select('*');
    if (opts.eq) {
      query = query.eq(opts.eq.field, opts.eq.value);
    }
    if (opts.orderBy) {
      query = query.order(opts.orderBy.field, { ascending: !!opts.orderBy.ascending });
    }
    if (opts.limit) {
      query = query.limit(opts.limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  async addDoc(table: string, payload: any) {
    const { data, error } = await sb.from(table).insert(payload).select();
    if (error) throw error;
    return data?.[0] ?? null;
  },
  async updateDoc(table: string, idField: string, id: any, payload: any) {
    const { data, error } = await sb.from(table).update(payload).eq(idField, id).select();
    if (error) throw error;
    return data?.[0] ?? null;
  },
  async deleteDoc(table: string, idField: string, id: any) {
    const { error } = await sb.from(table).delete().eq(idField, id);
    if (error) throw error;
    return true;
  },
  async getDocById(table: string, idField: string, id: any) {
    const { data, error } = await sb.from(table).select('*').eq(idField, id).limit(1).single();
    if (error) throw error;
    return data || null;
  }
};

export default { db, auth };
