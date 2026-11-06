"use client";
import { BACKEND } from "@/lib/env";
import { fakeData } from "./fake";
import { supabaseData } from "./supabase";
import type { DataLayer } from "./types";

/** Com as variáveis do Supabase definidas, usa o banco real; sem elas, dados locais no navegador. */
export const data: DataLayer = BACKEND ? supabaseData : fakeData;
export const usingBackend = BACKEND;
export type * from "./types";
