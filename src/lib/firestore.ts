import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Cycle } from "@/types";

const cyclesCol = (userId: string) =>
  collection(db, "users", userId, "cycles");

export async function addCycle(
  userId: string,
  data: Omit<Cycle, "firestoreId" | "userId" | "createdAt">
): Promise<string> {
  const ref = await addDoc(cyclesCol(userId), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCycles(userId: string): Promise<Cycle[]> {
  const q = query(cyclesCol(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<Cycle, "firestoreId">),
    firestoreId: d.id,
  }));
}

export async function getCycle(
  userId: string,
  firestoreId: string
): Promise<Cycle | null> {
  const ref = doc(db, "users", userId, "cycles", firestoreId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Cycle, "firestoreId">), firestoreId: snap.id };
}

export function genCycleId(existingIds: string[]): string {
  const d = new Date();
  const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const count = existingIds.filter((id) => id.includes(key)).length;
  return `RSP-${key}-${String(count + 1).padStart(3, "0")}`;
}
