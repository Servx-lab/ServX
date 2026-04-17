import React, { useState, useEffect } from "react";
import { Search, UserPlus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { searchUsers } from "./api";
import type { AdminRole, UserSearchHit } from "./types";

interface UserSearchInviteBarProps {
  onInvite: (email: string, role: AdminRole) => void;
  inviting: boolean;
}

const UserSearchInviteBar: React.FC<UserSearchInviteBarProps> = ({ onInvite, inviting }) => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserSearchHit | null>(null);
  const [role, setRole] = useState<AdminRole>("editor");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void searchUsers(debounced)
      .then((users) => {
        if (!cancelled) setResults(users);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const handlePick = (u: UserSearchHit) => {
    setSelected(u);
    setQuery(u.email || u.name);
    setOpen(false);
    setResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = selected?.email?.trim() || query.trim();
    if (!raw) return;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    if (!ok) return;
    onInvite(raw, role);
    setSelected(null);
    setQuery("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-5 w-5 shrink-0 text-cyan-600" />
        <h2 className="text-xl font-semibold text-gray-900">User discovery &amp; invite</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search by email, username, or name…"
            className="h-12 border-gray-200 bg-gray-50 pr-10 text-gray-900 placeholder:text-gray-400 focus-visible:border-cyan-500 focus-visible:ring-cyan-500"
            autoComplete="off"
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          {open && (results.length > 0 || loading) && query.trim().length >= 2 && (
            <ul
              className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {loading ? (
                <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>
              ) : (
                results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                      onClick={() => handlePick(u)}
                    >
                      <ProfilePhoto
                        src={u.avatarUrl}
                        alt=""
                        label={u.name || u.username || u.email}
                        className="h-9 w-9 border border-gray-200"
                        fallbackClassName="border-cyan-200 bg-cyan-50 text-cyan-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {u.name || u.username || "—"}
                        </div>
                        <div className="truncate text-xs text-gray-500">{u.email || "No email"}</div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Global role</label>
            <Select value={role} onValueChange={(v: AdminRole) => setRole(v)}>
              <SelectTrigger className="h-11 border-gray-200 bg-gray-50 text-gray-900 focus:ring-cyan-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-200 bg-white text-gray-900">
                <SelectItem value="owner">Owner — full administrative control</SelectItem>
                <SelectItem value="editor">Editor — full read/write on repos & deployment servers</SelectItem>
                <SelectItem value="viewer">Viewer — global read-only</SelectItem>
              </SelectContent>
            </Select>
            {role === "viewer" && (
              <p className="text-xs leading-snug text-gray-600">
                <span className="font-semibold text-violet-600">Viewer policy:</span> Viewers may view and copy
                environment variables where the product allows it; write actions remain blocked.
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={
              inviting ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((selected?.email || query).trim())
            }
            className="h-11 shrink-0 bg-cyan-600 px-6 font-semibold text-white hover:bg-cyan-700 sm:min-w-[140px]"
          >
            {inviting ? (
              "Adding…"
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add to team
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UserSearchInviteBar;
