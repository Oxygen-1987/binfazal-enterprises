// src/app/(dashboard)/expenses/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Trash2,
  Receipt,
  Calendar,
  Tag,
  Pencil, // Add this
} from "lucide-react";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function ExpensesPage() {
  const { userRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("current");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [monthFilter]);

  useEffect(() => {
    filterExpenses();
  }, [searchTerm, categoryFilter, expenses]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("expense_categories")
      .select("name")
      .order("name");

    if (data) {
      setCategories(data.map((cat) => cat.name));
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);

    let query = supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    // Apply month filter
    if (monthFilter === "current") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split("T")[0];
      query = query.gte("expense_date", monthStartStr);
    } else if (monthFilter === "previous") {
      const now = new Date();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query
        .gte("expense_date", prevMonthStart.toISOString().split("T")[0])
        .lt("expense_date", currentMonthStart.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching expenses:", error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Apply search
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (expense) =>
          expense.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (expense) => expense.category === categoryFilter,
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (!error) {
      setExpenses(expenses.filter((expense) => expense.id !== id));
      setDeleteId(null);
    }
  };

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  // Group expenses by category for summary
  const categorySummary = filteredExpenses.reduce(
    (acc: { [key: string]: number }, expense) => {
      acc[expense.category] =
        (acc[expense.category] || 0) + Number(expense.amount);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500">Track your business expenses</p>
        </div>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Entries</p>
              <p className="text-2xl font-bold">{filteredExpenses.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Summary */}
      {Object.keys(categorySummary).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Category Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(categorySummary).map(([category, amount]) => (
                <div
                  key={category}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {category}
                  </span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={monthFilter === "current" ? "default" : "outline"}
            size="sm"
            onClick={() => setMonthFilter("current")}
          >
            This Month
          </Button>
          <Button
            variant={monthFilter === "previous" ? "default" : "outline"}
            size="sm"
            onClick={() => setMonthFilter("previous")}
          >
            Last Month
          </Button>
          <Button
            variant={monthFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setMonthFilter("all")}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={categoryFilter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No expenses found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || categoryFilter !== "all"
                ? "Try different filters"
                : "Add your first expense"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Card
              key={expense.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-3">
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                        <Receipt className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {expense.description || expense.category}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="flex items-center text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Tag className="h-3 w-3 mr-1" />
                            {expense.category}
                          </span>
                          <span className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(expense.expense_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <p className="font-bold text-lg text-red-600">
                      {formatCurrency(expense.amount)}
                    </p>

                    <div className="flex space-x-1">
                      <Link href={`/expenses/${expense.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this expense? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(expense.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
