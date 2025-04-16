"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SubmissionForm() {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const onSubmit = async (data) => {
    if (!session?.user) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          submittedById: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create submission");
      }

      const result = await response.json();
      
      // Reset form and redirect to the new submission
      reset();
      router.push(`/submissions/${result.id}`);
      
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to create submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label 
          htmlFor="title" 
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          {...register("title", { required: "Title is required" })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>
      
      <div>
        <label 
          htmlFor="customerName" 
          className="block text-sm font-medium text-gray-700"
        >
          Customer Name
        </label>
        <input
          id="customerName"
          type="text"
          {...register("customerName", { required: "Customer name is required" })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.customerName && (
          <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
        )}
      </div>
      
      <div>
        <label 
          htmlFor="orgId" 
          className="block text-sm font-medium text-gray-700"
        >
          Organization ID
        </label>
        <input
          id="orgId"
          type="text"
          {...register("orgId", { required: "Organization ID is required" })}
          className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.orgId && (
          <p className="mt-1 text-sm text-red-600">{errors.orgId.message}</p>
        )}
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit for Review"}
        </button>
      </div>
    </form>
  );
}