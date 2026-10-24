import type { Metadata } from "next";
import SettingsPage from "@/components/SettingsPage";

export const metadata: Metadata = { title: "Settings · OpenAI Chatbot" };

export default function Settings() {
  return <SettingsPage />;
}
