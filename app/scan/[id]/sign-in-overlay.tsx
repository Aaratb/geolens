"use client";

import { SignIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SignInOverlay() {
  const [open, setOpen] = useState(false);

  return (
    <SignedOut>
      <div className="absolute inset-0 grid place-items-center pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="surface rounded-xl px-4 py-2.5 text-[13px] flex items-center gap-2 hover:opacity-90"
        >
          <Lock className="h-3.5 w-3.5" />
          Sign in to unlock the full report
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Sign in to GEOlens</DialogTitle>
            <DialogDescription>
              Unlock the full audit, save your scan history, and join the fixer agent waitlist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-2xl",
                },
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SignedOut>
  );
}
