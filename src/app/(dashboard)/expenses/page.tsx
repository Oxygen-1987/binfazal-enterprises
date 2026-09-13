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
  Pencil,
  List,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  DateRangeFilter,
  getDateRange,
  type DateFilterType,
} from "@/components/shared/date-range-filter";
import { Pagination } from "@/components/shared/pagination";
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
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("current_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [categories, setCategories] = useState<string[]>([]);

  // Load saved view preference
  useEffect(() => {
    const savedView = localStorage.getItem("expensesViewMode");
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const changeViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("expensesViewMode", mode);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter, customFrom, customTo, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, dateFilter, customFrom, customTo]);

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

    const { from, to } = getDateRange(dateFilter, customFrom, customTo);

    let query = supabase.from("expenses").select("*", { count: "exact" });

    if (from) query = query.gte("expense_date", from);
    if (to) query = query.lte("expense_date", to);

    const fromIndex = (currentPage - 1) * itemsPerPage;
    const toIndex = fromIndex + itemsPerPage - 1;

    query = query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching expenses:", error);
    } else {
      setExpenses(data || []);
      setTotalCount(count || 0);

      const pageTotal = (data || []).reduce(
        (sum, e) => sum + Number(e.amount),
        0,
      );
      setTotalAmount(pageTotal);
    }
    setLoading(false);
  };

  // Client-side filter for search + category
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (!error) {
      setExpenses(expenses.filter((expense) => expense.id !== id));
      setTotalCount((prev) => prev - 1);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500 text-sm">Track your business expenses</p>
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
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Page Total</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Entries</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="space-y-3">
        {/* Date Filter */}
        <DateRangeFilter
          value={dateFilter}
          customFrom={customFrom}
          customTo={customTo}
          onChange={(value, from, to) => {
            setDateFilter(value);
            if (from) setCustomFrom(from);
            if (to) setCustomTo(to);
          }}
        />

        {/* Search + View Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => changeViewMode("list")}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === "list"
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeViewMode("grid")}
              className={`px-3 py-2 flex items-center justify-center transition-colors ${
                viewMode === "grid"
                  ? "bg-[#FF6B00] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="whitespace-nowrap"
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={categoryFilter === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Expenses Display */}
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
                : "No expenses in this period"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* LIST VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                    Description
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Tag className="h-3 w-3 mr-1" />
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <div className="truncate max-w-[400px] text-gray-600 dark:text-gray-400 text-xs">
                        {expense.description || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-red-600 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/expenses/${expense.id}/edit`}>
                          <button
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>

                        {userRole === "owner" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Expense
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense?
                                  This action cannot be undone.
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* GRID VIEW */
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

                      {userRole === "owner" && (
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
                              <AlertDialogTitle>
                                Delete Expense
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this expense?
                                This action cannot be undone.
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
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}
