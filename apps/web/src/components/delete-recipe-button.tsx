"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type DeleteRecipeButtonProps = {
  recipeId: string;
};

export function DeleteRecipeButton({ recipeId }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isDeleting) {
      return;
    }

    setIsModalOpen(false);
    setError(null);
  };

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await response.text());
        setIsDeleting(false);
        return;
      }

      router.push("/recipes");
      router.refresh();
    } catch {
      setError("Could not delete recipe. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={openModal}
        disabled={isDeleting}
        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {isDeleting ? "Deleting..." : "Delete recipe"}
      </Button>
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-foreground text-lg font-semibold">
              Delete recipe?
            </h2>

            <p className="text-muted-foreground mt-2 text-sm">
              This action cannot be undone. This recipe will be permanently
              removed from your account.
            </p>

            {error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete recipe"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
