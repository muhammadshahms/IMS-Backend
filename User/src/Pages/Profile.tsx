"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { message, Modal, Radio } from "antd"
import Loader from "@/components/Loader"
import { userRepo } from "../repositories/userRepo"
import { Edit3 as EditIcon, LogOut as LogoutIcon, Mail as MailIcon, Phone as PhoneIcon, FileText as FileTextIcon } from "lucide-react"
import { Input, Select } from "antd"
const { Option } = Select

export default function ProfileShadCN() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    name: "",
    bq_id: "",
    email: "",
    phone: "",
    CNIC: "",
    course: "",
    gender: "",
    shift: "",
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await userRepo.profile()
        setUser(res.user || res)
        setFormData({
          ...formData,
          ...{
            name: res.user?.name || res.name,
            bq_id: res.user?.bq_id || res.bq_id,
            email: res.user?.email || res.email,
            phone: res.user?.phone || "",
            CNIC: res.user?.CNIC || "",
            course: res.user?.course || "",
            gender: res.user?.gender || "",
            shift: res.user?.shift || "",
          },
        })
        setEditingId(res.user?._id || res._id)
      } catch (err) {
        console.error(err)
        message.error("Failed to fetch profile")
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
    
  }, [])

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await userRepo.updateUser(editingId, formData)
        setUser({ ...user, ...formData })
        message.success("Profile updated successfully")
      }
      setIsModalOpen(false)
    } catch (error: any) {
      console.error(error)
      message.error("Action failed")
    }
  }

  if (loading) return <Loader />

  const profileFields = [
    { label: "BQ ID", value: user?.bq_id },
    { label: "Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Phone", value: user?.phone },
    { label: "CNIC", value: user?.CNIC },
    { label: "Course", value: user?.course },
    { label: "Gender", value: user?.gender },
    { label: "Shift", value: user?.shift },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full flex items-center justify-center text-2xl font-bold">
              <img
              src={`https://ui-avatars.com/api/?name=${user?.name || "User"}`}
              alt="User"
              className="w-16 h-16 rounded-full border"
            />
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-900">{user?.name || "Student Name"}</span>
              <p className="text-gray-500">{user?.incubation_id || "N/A"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <EditIcon className="w-4 h-4" /> Edit Profile
            </Button>
           
          </div>
        </div>

        {/* Tabs for Details / Contact */}
        <Card className="p-6">
          <Tabs defaultValue="details" className="w-full">
            

            <TabsContent value="details" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileFields.map((field, idx) => (
                <Card key={idx} className="p-4 flex flex-col gap-1 border border-gray-200 shadow hover:shadow-md transition">
                  <p className="text-sm text-gray-400">{field.label}</p>
                  <p className="font-semibold text-gray-900">{field.value || "N/A"}</p>
                </Card>
              ))}
            </TabsContent>

            {/* <TabsContent value="contact" className="mt-6 space-y-4">
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-md">
                <MailIcon className="w-5 h-5 text-black-" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="font-medium text-gray-900">{user?.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-md">
                <PhoneIcon className="w-5 h-5 text-black-" />
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900">{user?.phone || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-md">
                <FileTextIcon className="w-5 h-5 text-black-" />
                <div>
                  <p className="text-sm text-gray-400">CNIC</p>
                  <p className="font-medium text-gray-900">{user?.CNIC || "N/A"}</p>
                </div>
              </div>
            </TabsContent> */}
          </Tabs>
        </Card>

        {/* Modal for updating profile */}
        <Modal
          title="Edit Profile"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          centered
        >
          <div className="space-y-4">
            {["name", "bq_id", "email", "phone", "CNIC"].map((field) => (
              <div key={field}>
                <label className="block mb-1 font-medium text-gray-700">{field.toUpperCase()}</label>
                <Input name={field} value={formData[field]} onChange={handleChange} />
              </div>
            ))}

            

            <Button className="w-full mt-4" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}
