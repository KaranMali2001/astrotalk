"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { baseURL } from "@/lib/api";
import { Activity, Clock, DollarSign, Download, Edit, Phone, Shield, TrendingDown, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Types based on API documentation
interface Admin {
  id: string;
  phoneNumber: string;
  name: string;
  email: string;
  isActive: boolean;
  wallet: {
    id: string;
    balance: number;
    totalBalence: number;
  } | null;
}

interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  professionals: {
    total: number;
    active: number;
    verified: number;
    unverified: number;
  };
  calls: {
    total: number;
    completed: number;
    ongoing: number;
  };
  revenue: {
    total: number;
  };
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  isInCall: boolean;
  createdAt: string;
  updatedAt: string;
  wallet: {
    id: string;
    balance: number;
    totalBalence: number;
  } | null;
  _count: {
    callsAsUser: number;
  };
}

interface Professional {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  isVerified: boolean;
  isInCall: boolean;
  perMinuteRateCall: number;
  perMinuteRateChat: number;
  createdAt: string;
  updatedAt: string;
  wallet: {
    id: string;
    balance: number;
    totalBalence: number;
  } | null;
  _count: {
    callsAsProfessional: number;
  };
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [walletModal, setWalletModal] = useState({ open: false, type: "user", id: "", name: "" });
  const [statusModal, setStatusModal] = useState({ open: false, type: "user", id: "", name: "", currentStatus: false });
  const [verificationModal, setVerificationModal] = useState({ open: false, id: "", name: "", currentStatus: false });
  const [ratesModal, setRatesModal] = useState({
    open: false,
    id: "",
    name: "",
    currentCallRate: 0,
    currentChatRate: 0,
  });
  const [walletForm, setWalletForm] = useState({ amount: "", type: "ADD", reason: "", loading: false });
  const [statusForm, setStatusForm] = useState({ reason: "", loading: false });
  const [verificationForm, setVerificationForm] = useState({ verificationNotes: "", loading: false });
  const [ratesForm, setRatesForm] = useState({ callRate: "", chatRate: "", loading: false });

  const [reportsLoading, setReportsLoading] = useState(false);
  const [callReports, setCallReports] = useState([]);
  const [revenueReports, setRevenueReports] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    startDate: "",
    endDate: "",
    status: "all",
    professionalId: "",
  });

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number with at least 10 digits");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/v1/admin/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (data.success) {
        setRequestId(data.data.requestId);
        setOtpSent(true);
        toast.success("OTP sent successfully! Please check your phone for the verification code");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/v1/admin/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp, requestId }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("adminToken", data.data.token);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${data.data.admin.name}!`);
        loadDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const [statsResponse, usersResponse, professionalsResponse] = await Promise.all([
        fetch(`${baseURL}/api/v1/admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/v1/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/v1/admin/professionals`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsData = await statsResponse.json();
      const usersData = await usersResponse.json();
      const professionalsData = await professionalsResponse.json();

      // Check for authentication errors
      if (handleApiError(statsResponse, statsData) || handleApiError(usersResponse, usersData) || handleApiError(professionalsResponse, professionalsData)) {
        return;
      }

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        toast.error(statsData.message || "Failed to load dashboard stats");
      }

      if (usersData.success) {
        setUsers(usersData.data.users || []);
      } else {
        toast.error(usersData.message || "Failed to load users");
      }

      if (professionalsData.success) {
        setProfessionals(professionalsData.data.professionals || []);
      } else {
        toast.error(professionalsData.message || "Failed to load professionals");
      }
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleWalletUpdate = async () => {
    if (!walletForm.amount || !walletForm.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    setWalletForm((prev) => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("adminToken");
      const endpoint = walletModal.type === "user" ? `${baseURL}/api/v1/admin/users/wallet` : `${baseURL}/api/v1/admin/professionals/wallet`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          [walletModal.type === "user" ? "userId" : "professionalId"]: walletModal.id,
          amount: Math.round(Number.parseFloat(walletForm.amount) * 100), // Convert to paisa
          type: walletForm.type,
          reason: walletForm.reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully ${walletForm.type === "ADD" ? "added" : "deducted"} ₹${walletForm.amount} ${walletForm.type === "ADD" ? "to" : "from"} ${walletModal.name}'s wallet`);
        setWalletModal({ open: false, type: "user", id: "", name: "" });
        setWalletForm({ amount: "", type: "ADD", reason: "", loading: false });
        loadDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update wallet");
    } finally {
      setWalletForm((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusForm.reason) {
      toast.error("Please provide a reason for status change");
      return;
    }

    setStatusForm((prev) => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("adminToken");
      const endpoint = statusModal.type === "user" ? `${baseURL}/api/v1/admin/users/status` : `${baseURL}/api/v1/admin/professionals/status`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          [statusModal.type === "user" ? "userId" : "professionalId"]: statusModal.id,
          isActive: !statusModal.currentStatus,
          reason: statusForm.reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully ${!statusModal.currentStatus ? "activated" : "deactivated"} ${statusModal.name}`);
        setStatusModal({ open: false, type: "user", id: "", name: "", currentStatus: false });
        setStatusForm({ reason: "", loading: false });
        loadDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setStatusForm((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleVerificationUpdate = async () => {
    setVerificationForm((prev) => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(`${baseURL}/api/v1/admin/professionals/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          professionalId: verificationModal.id,
          isVerified: !verificationModal.currentStatus,
          verificationNotes: verificationForm.verificationNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully ${!verificationModal.currentStatus ? "verified" : "unverified"} ${verificationModal.name}`);
        setVerificationModal({ open: false, id: "", name: "", currentStatus: false });
        setVerificationForm({ verificationNotes: "", loading: false });
        loadDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update verification");
    } finally {
      setVerificationForm((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleRatesUpdate = async () => {
    if (!ratesForm.callRate || !ratesForm.chatRate) {
      toast.error("Please fill in both call and chat rates");
      return;
    }

    setRatesForm((prev) => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(`${baseURL}/api/v1/admin/professionals/rates`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          professionalId: ratesModal.id,
          perMinuteRateCall: Math.round(Number.parseFloat(ratesForm.callRate) * 100), // Convert to paisa
          perMinuteRateChat: Math.round(Number.parseFloat(ratesForm.chatRate) * 100), // Convert to paisa
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Successfully updated rates for ${ratesModal.name}`);
        setRatesModal({ open: false, id: "", name: "", currentCallRate: 0, currentChatRate: 0 });
        setRatesForm({ callRate: "", chatRate: "", loading: false });
        loadDashboardData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update rates");
    } finally {
      setRatesForm((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadReportsData = async () => {
    setReportsLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const queryParams = new URLSearchParams({
        startDate: reportFilters.startDate,
        endDate: reportFilters.endDate,
        status: reportFilters.status,
        ...(reportFilters.professionalId && { professionalId: reportFilters.professionalId }),
      });

      const [callReportsResponse, revenueResponse] = await Promise.all([
        fetch(`${baseURL}/api/v1/admin/reports/calls?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Note: Revenue report endpoint doesn't exist in backend, using calls for now
        fetch(`${baseURL}/api/v1/admin/reports/calls?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const callReportsData = await callReportsResponse.json();
      const revenueData = await revenueResponse.json();

      if (callReportsData.success) {
        setCallReports(callReportsData.data);
      }
      if (revenueData.success) {
        setRevenueReports(revenueData.data);
      }
    } catch (error) {
      toast.error("Failed to load reports data");
    } finally {
      setReportsLoading(false);
    }
  };

  const exportReports = (type: "calls" | "revenue") => {
    const headers = type === "calls" ? ["Call ID", "User", "Professional", "Duration", "Status", "Amount", "Date"] : ["Date", "Total Revenue", "Total Calls", "Average Call Duration", "Commission"];

    let csvContent: string;
    if (type === "calls") {
      csvContent = [headers.join(","), ...mockCallReports.map((item) => [item.id, item.userName, item.professionalName, item.duration, item.status, item.amount, item.createdAt].join(","))].join("\n");
    } else {
      csvContent = [headers.join(","), ...mockRevenueReports.map((item) => [item.date, item.totalRevenue, item.totalCalls, item.avgDuration, item.commission].join(","))].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-reports.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`${type === "calls" ? "Call" : "Revenue"} reports exported successfully`);
  };

  const refreshDashboard = () => {
    loadDashboardData();
    toast.success("Dashboard refreshed successfully");
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setPhoneNumber("");
    setOtp("");
    setOtpSent(false);
  };

  const exportUsers = () => {
    const csvContent = [
      ["Name", "Phone", "Email", "Status", "Wallet Balance", "Created At"].join(","),
      ...users.map((user) =>
        [user.name || user.username, user.phoneNumber, user.email, user.isActive ? "Active" : "Inactive", ((user.wallet?.balance || 0) / 100).toFixed(2), user.createdAt].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Users data exported successfully");
  };

  const exportProfessionals = () => {
    const csvContent = [
      ["Name", "Phone", "Email", "Status", "Verified", "Call Rate", "Chat Rate", "Wallet Balance"].join(","),
      ...professionals.map((prof) =>
        [
          prof.name,
          prof.phoneNumber,
          prof.email,
          prof.isActive ? "Active" : "Inactive",
          prof.isVerified ? "Verified" : "Not Verified",
          (prof.perMinuteRateCall / 100).toFixed(2),
          (prof.perMinuteRateChat / 100).toFixed(2),
          ((prof.wallet?.balance || 0) / 100).toFixed(2),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "professionals.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Professionals data exported successfully");
  };

  const mockCallReports = [
    {
      id: "C001",
      userName: "John Doe",
      professionalName: "Dr. Smith",
      duration: "15:30",
      status: "completed",
      amount: 150,
      createdAt: "2023-12-01",
    },
    {
      id: "C002",
      userName: "Jane Smith",
      professionalName: "Advocate Johnson",
      duration: "22:45",
      status: "completed",
      amount: 340,
      createdAt: "2023-12-01",
    },
    {
      id: "C003",
      userName: "Alice Johnson",
      professionalName: "Engineer Davis",
      duration: "08:15",
      status: "cancelled",
      amount: 0,
      createdAt: "2023-12-02",
    },
    {
      id: "C004",
      userName: "Bob Wilson",
      professionalName: "Dr. Smith",
      duration: "30:00",
      status: "completed",
      amount: 300,
      createdAt: "2023-12-02",
    },
  ];

  const mockRevenueReports = [
    { date: "2023-12-01", totalRevenue: 2500, totalCalls: 15, avgDuration: "18:30", commission: 375 },
    { date: "2023-12-02", totalRevenue: 3200, totalCalls: 20, avgDuration: "16:45", commission: 480 },
    { date: "2023-12-03", totalRevenue: 1800, totalCalls: 12, avgDuration: "15:20", commission: 270 },
    { date: "2023-12-04", totalRevenue: 4100, totalCalls: 25, avgDuration: "19:15", commission: 615 },
  ];

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      setIsAuthenticated(true);
      loadDashboardData();
    }
  }, []);

  // Handle API errors and token expiration
  const handleApiError = (response: Response, data: any) => {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("adminToken");
      setIsAuthenticated(false);
      toast.error("Session expired. Please login again.");
      return true;
    }
    return false;
  };

  // Login Form Component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Admin Login</CardTitle>
            <CardDescription>Enter your phone number to receive an OTP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="Enter your phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={otpLoading} />
            </div>
            <Button onClick={sendOTP} className="w-full" disabled={otpLoading || phoneNumber.length < 10}>
              {otpLoading ? "Sending..." : "Send OTP"}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={otpSent} onOpenChange={setOtpSent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter OTP</DialogTitle>
              <DialogDescription>We've sent a 6-digit code to {phoneNumber}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input id="otp" type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} disabled={loginLoading} />
              </div>
              <Button onClick={verifyOTP} className="w-full" disabled={loginLoading || otp.length !== 6}>
                {loginLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    percentage,
    loading = false,
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    trend?: "up" | "down";
    percentage?: number;
    loading?: boolean;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            {/* <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" /> */}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold text-foreground">{value}</p>
              <div className="flex items-center gap-2">
                {trend && (
                  <div className={`flex items-center gap-1 ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {percentage && <span className="text-xs font-medium">{percentage}%</span>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon className="h-8 w-8 text-primary" />
              {percentage !== undefined && (
                <div className="w-12">
                  <Progress value={percentage} className="h-1" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const DetailedMetricsCard = ({ title, data, loading = false }: { title: string; data: any; loading?: boolean }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                {/* <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" /> */}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-medium">{value as string}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Main Dashboard Layout
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Admin Dashboard</h2>
            <div className="flex items-center space-x-4">
              <Button onClick={refreshDashboard}>Refresh Data</Button>
              <Button onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mt-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="professionals">Professionals</TabsTrigger>
              <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats?.users?.total || 0}
                  subtitle={`${stats?.users?.active || 0} Active`}
                  icon={Users}
                  trend={stats?.users?.active && stats?.users?.total ? (stats.users.active / stats.users.total > 0.7 ? "up" : "down") : undefined}
                  percentage={stats?.users?.active && stats?.users?.total ? Math.round((stats.users.active / stats.users.total) * 100) : undefined}
                  loading={statsLoading}
                />
                <StatCard
                  title="Total Professionals"
                  value={stats?.professionals?.total || 0}
                  subtitle={`${stats?.professionals?.verified || 0} Verified`}
                  icon={UserCheck}
                  trend={stats?.professionals?.verified && stats?.professionals?.total ? (stats.professionals.verified / stats.professionals.total > 0.7 ? "up" : "down") : undefined}
                  percentage={stats?.professionals?.verified && stats?.professionals?.total ? Math.round((stats.professionals.verified / stats.professionals.total) * 100) : undefined}
                  loading={statsLoading}
                />
                <StatCard
                  title="Total Calls"
                  value={stats?.calls?.total || 0}
                  subtitle={`${stats?.calls?.completed || 0} Completed`}
                  icon={Phone}
                  trend={stats?.calls?.completed && stats?.calls?.total ? (stats.calls.completed / stats.calls.total > 0.8 ? "up" : "down") : undefined}
                  percentage={stats?.calls?.completed && stats?.calls?.total ? Math.round((stats.calls.completed / stats.calls.total) * 100) : undefined}
                  loading={statsLoading}
                />
                <StatCard title="Total Revenue" value={`₹${stats?.revenue?.total || 0}`} subtitle="Platform Revenue" icon={DollarSign} trend="up" percentage={undefined} loading={statsLoading} />
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailedMetricsCard
                  title="User Statistics"
                  data={{
                    "Total Users": stats?.users?.total || 0,
                    "Active Users": stats?.users?.active || 0,
                    "Inactive Users": stats?.users?.inactive || 0,
                  }}
                  loading={statsLoading}
                />
                <DetailedMetricsCard
                  title="Professional Statistics"
                  data={{
                    "Total Professionals": stats?.professionals?.total || 0,
                    "Active Professionals": stats?.professionals?.active || 0,
                    "Verified Professionals": stats?.professionals?.verified || 0,
                    "Unverified Professionals": stats?.professionals?.unverified || 0,
                  }}
                  loading={statsLoading}
                />
              </div>
            </TabsContent>
            <TabsContent value="users">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Users</h3>
                <div className="flex items-center space-x-4">
                  <Input type="text" placeholder="Search Users..." className="max-w-xs" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={exportUsers}>Export Users</Button>
                </div>
              </div>
              <div className="bg-white shadow rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wallet Balance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 && !statsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name || user.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phoneNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Badge className={user.isActive ? "bg-green-500 text-white" : "bg-red-500 text-white"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{((user.wallet?.balance || 0) / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.createdAt}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="outline" size="icon" onClick={() => setWalletModal({ open: true, type: "user", id: user.id, name: user.name })}>
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setStatusModal({
                                  open: true,
                                  type: "user",
                                  id: user.id,
                                  name: user.name,
                                  currentStatus: user.isActive,
                                })
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="professionals">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Professionals</h3>
                <div className="flex items-center space-x-4">
                  <Input type="text" placeholder="Search Professionals..." className="max-w-xs" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={exportProfessionals}>Export Professionals</Button>
                </div>
              </div>
              <div className="bg-white shadow rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specialization
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verified
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Call Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chat Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wallet Balance
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {professionals.length === 0 && !statsLoading ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                          No professionals found
                        </td>
                      </tr>
                    ) : (
                      professionals.map((prof) => (
                        <tr key={prof.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prof.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.phoneNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{prof.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">N/A</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Badge className={prof.isActive ? "bg-green-500 text-white" : "bg-red-500 text-white"}>{prof.isActive ? "Active" : "Inactive"}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Badge className={prof.isVerified ? "bg-blue-500 text-white" : "bg-yellow-500 text-white"}>{prof.isVerified ? "Verified" : "Not Verified"}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{(prof.perMinuteRateCall / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{(prof.perMinuteRateChat / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{((prof.wallet?.balance || 0) / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="outline" size="icon" onClick={() => setWalletModal({ open: true, type: "professional", id: prof.id, name: prof.name })}>
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setStatusModal({
                                  open: true,
                                  type: "professional",
                                  id: prof.id,
                                  name: prof.name,
                                  currentStatus: prof.isActive,
                                })
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setVerificationModal({
                                  open: true,
                                  id: prof.id,
                                  name: prof.name,
                                  currentStatus: prof.isVerified,
                                })
                              }
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setRatesModal({
                                  open: true,
                                  id: prof.id,
                                  name: prof.name,
                                  currentCallRate: prof.perMinuteRateCall,
                                  currentChatRate: prof.perMinuteRateChat,
                                });
                                setRatesForm({
                                  callRate: (prof.perMinuteRateCall / 100).toString(),
                                  chatRate: (prof.perMinuteRateChat / 100).toString(),
                                  loading: false,
                                });
                              }}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="reports">
              <div className="space-y-6">
                {/* Reports Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Reports & Analytics</h3>
                  <Button onClick={loadReportsData} disabled={reportsLoading}>
                    {reportsLoading ? "Loading..." : "Refresh Reports"}
                  </Button>
                </div>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" type="date" value={reportFilters.startDate} onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" type="date" value={reportFilters.endDate} onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={reportFilters.status} onValueChange={(value) => setReportFilters({ ...reportFilters, status: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="professional">Professional</Label>
                        <Select value={reportFilters.professionalId} onValueChange={(value) => setReportFilters({ ...reportFilters, professionalId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Professionals" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Professionals</SelectItem>
                            {professionals.map((prof) => (
                              <SelectItem key={prof.id} value={prof.id}>
                                {prof.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Calls Today" value={45} subtitle="vs yesterday" icon={Phone} trend="up" percentage={12} />
                  <StatCard title="Revenue Today" value="₹12,500" subtitle="vs yesterday" icon={DollarSign} trend="up" percentage={8} />
                  <StatCard title="Avg Call Duration" value="18:30" subtitle="minutes" icon={Clock} trend="down" percentage={5} />
                  <StatCard title="Active Professionals" value={28} subtitle="online now" icon={Activity} trend="up" percentage={15} />
                </div>

                {/* Call Reports */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Call Reports</CardTitle>
                      <Button onClick={() => exportReports("calls")} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Call ID</th>
                            <th className="text-left p-2 font-medium">User</th>
                            <th className="text-left p-2 font-medium">Professional</th>
                            <th className="text-left p-2 font-medium">Duration</th>
                            <th className="text-left p-2 font-medium">Status</th>
                            <th className="text-left p-2 font-medium">Amount</th>
                            <th className="text-left p-2 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockCallReports.map((call) => (
                            <tr key={call.id} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-mono text-sm">{call.id}</td>
                              <td className="p-2">{call.userName}</td>
                              <td className="p-2">{call.professionalName}</td>
                              <td className="p-2 font-mono">{call.duration}</td>
                              <td className="p-2">
                                <Badge className={call.status === "completed" ? "bg-green-500 text-white" : call.status === "cancelled" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"}>
                                  {call.status}
                                </Badge>
                              </td>
                              <td className="p-2 font-medium">₹{call.amount}</td>
                              <td className="p-2 text-sm text-gray-600">{call.createdAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Reports */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Revenue Analytics</CardTitle>
                      <Button onClick={() => exportReports("revenue")} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Date</th>
                            <th className="text-left p-2 font-medium">Total Revenue</th>
                            <th className="text-left p-2 font-medium">Total Calls</th>
                            <th className="text-left p-2 font-medium">Avg Duration</th>
                            <th className="text-left p-2 font-medium">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockRevenueReports.map((revenue, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-2">{revenue.date}</td>
                              <td className="p-2 font-medium text-green-600">₹{revenue.totalRevenue.toLocaleString()}</td>
                              <td className="p-2">{revenue.totalCalls}</td>
                              <td className="p-2 font-mono">{revenue.avgDuration}</td>
                              <td className="p-2 font-medium">₹{revenue.commission}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailedMetricsCard
                    title="Call Status Breakdown"
                    data={{
                      Completed: "85%",
                      Cancelled: "10%",
                      Ongoing: "5%",
                    }}
                  />
                  <DetailedMetricsCard
                    title="Top Performing Professionals"
                    data={{
                      "Dr. Smith": "₹15,000",
                      "Advocate Johnson": "₹12,500",
                      "Engineer Davis": "₹8,200",
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={walletModal.open} onOpenChange={(open) => setWalletModal({ ...walletModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Wallet</DialogTitle>
            <DialogDescription>Add or deduct money from the user's wallet</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input id="amount" value={walletForm.amount} onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })} className="col-span-3" type="number" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select value={walletForm.type} onValueChange={(value) => setWalletForm({ ...walletForm, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">ADD</SelectItem>
                  <SelectItem value="DEDUCT">DEDUCT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea id="reason" value={walletForm.reason} onChange={(e) => setWalletForm({ ...walletForm, reason: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleWalletUpdate}>Update Wallet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusModal.open} onOpenChange={(open) => setStatusModal({ ...statusModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Activate or deactivate the user</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Textarea id="reason" value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verificationModal.open} onOpenChange={(open) => setVerificationModal({ ...verificationModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Verification</DialogTitle>
            <DialogDescription>Verify or unverify the professional</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="verificationNotes" className="text-right">
                Verification Notes
              </Label>
              <Textarea
                id="verificationNotes"
                value={verificationForm.verificationNotes}
                onChange={(e) => setVerificationForm({ ...verificationForm, verificationNotes: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleVerificationUpdate}>Update Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ratesModal.open} onOpenChange={(open) => setRatesModal({ ...ratesModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Rates</DialogTitle>
            <DialogDescription>Update the call and chat rates for the professional</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="callRate" className="text-right">
                Call Rate
              </Label>
              <Input id="callRate" value={ratesForm.callRate} onChange={(e) => setRatesForm({ ...ratesForm, callRate: e.target.value })} className="col-span-3" type="number" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chatRate" className="text-right">
                Chat Rate
              </Label>
              <Input id="chatRate" value={ratesForm.chatRate} onChange={(e) => setRatesForm({ ...ratesForm, chatRate: e.target.value })} className="col-span-3" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRatesUpdate}>Update Rates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
