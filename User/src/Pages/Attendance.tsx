import React, { useEffect, useState } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { attRepo } from "@/repositories/attRepo";
import Loader from "@/components/Loader";
import { useAuthStore } from "@/hooks/store/authStore";

interface AttendanceData {
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
}

interface HistoryRecord {
  _id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
}

const Attendance: React.FC = () => {
  const { user } = useAuthStore(); // Get user directly from store
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Load today's attendance
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?._id) {
        console.error("User ID not available");
        setIsLoading(false);
        return;
      }

      try {
        const res = await attRepo.getTodayStatus(user._id);
        setAttendance(res || null);
      } catch (err: any) {
        console.error("Error fetching attendance:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, [user?._id]);

  // ✅ Load user attendance history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?._id) {
        console.error("User ID not available");
        return;
      }

      setIsHistoryLoading(true);
      try {
        const res = await attRepo.getUserHistory(user._id);
        setHistory(res.history || []);
      } catch (err: any) {
        console.error("Error fetching history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [user?._id]);

  // ✅ Columns for Ant Design Table
  const columns: ColumnsType<HistoryRecord> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt: string) =>
        createdAt
          ? new Date(createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
    {
      title: "Check In",
      dataIndex: "checkInTime",
      key: "checkInTime",
      render: (text) =>
        text ? new Date(text).toLocaleTimeString() : "—",
    },
    {
      title: "Check Out",
      dataIndex: "checkOutTime",
      key: "checkOutTime",
      render: (text) =>
        text ? new Date(text).toLocaleTimeString() : "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
  ];

  // Show loader while user data is being fetched
  if (!user?._id) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  const isCheckedIn = Boolean(attendance?.checkInTime);
  const isCheckedOut = Boolean(attendance?.checkOutTime);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold ml-5 mt-5">Today's Status</h2>

      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader />
        </div>
      ) : isCheckedIn ? (
        <div className="bg-gray-100 dark:bg-neutral-800 p-3 rounded-md shadow-sm text-sm w-fit ml-5">
          <p>
            <span className="font-semibold">Status:</span>{" "}
            {attendance?.status || (isCheckedOut ? "Checked Out" : "Checked In")}
          </p>
          <p>
            <span className="font-semibold">Check-in Time:</span>{" "}
            {attendance?.checkInTime
              ? new Date(attendance.checkInTime).toLocaleTimeString()
              : "—"}
          </p>
          <p>
            <span className="font-semibold">Check-out Time:</span>{" "}
            {attendance?.checkOutTime
              ? new Date(attendance.checkOutTime).toLocaleTimeString()
              : "Not checked out yet"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 ml-5">No check-in recorded today.</p>
      )}

      {/* ✅ History Table */}
      <div>
        <h2 className="text-lg font-semibold mb-2 ml-5">Your Attendance History</h2>
        {isHistoryLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500 ml-5">No records found.</p>
        ) : (
          <Table
            columns={columns}
            dataSource={history.map((item) => ({ ...item, key: item._id }))}
            pagination={{ pageSize: 5 }}
            bordered
            className="ml-5 mr-5"
          />
        )}
      </div>
    </div>
  );
};

export default Attendance;