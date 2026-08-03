"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <button
        type="button"
        onClick={openModal}
        disabled={isDeleting}
        className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Deleting..." : "Delete recipe"}
      </button>
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Delete recipe?
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              This action cannot be undone. This recipe will be permanently
              removed from your account.
            </p>

            {error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isDeleting}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete recipe"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
