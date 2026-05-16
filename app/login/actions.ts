"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

export async function login(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const password = (formData.get("password") as string) ?? "";
  const expected = process.env.APP_PASSWORD;

  if (!expected) throw new Error("APP_PASSWORD env var is not set");

  if (password !== expected) {
    return "Wrong password. Try again.";
  }

  const secret = process.env.APP_SECRET ?? "dev-secret-change-me";
  const token = createHmac("sha256", secret).update("authenticated").digest("hex");

  (await cookies()).set("auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  const from = (formData.get("from") as string) || "/";
  redirect(from);
}

export async function logout() {
  (await cookies()).delete("auth");
  redirect("/login");
}
