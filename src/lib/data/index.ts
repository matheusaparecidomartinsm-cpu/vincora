"use client";
import { fakeData } from "./fake";
import type { DataLayer } from "./types";

/** Ponto único de troca: /replica-backend substitui por supabaseData com a mesma interface. */
export const data: DataLayer = fakeData;
export type * from "./types";
