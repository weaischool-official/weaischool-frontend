"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import api from "@/lib/api";

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Hindi",
  "Social Studies",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Physical Education",
  "Custom (Type below...)", // YEH RAHA TERA CUSTOM OPTION
];

function generateEmployeeId(): string {
  return `EMP${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
}

export default function AddTeacherSimplePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "male",
    date_of_birth: "",
    subject: "",
    custom_subject: "",
    employee_id: "",
  });

  // Client side ID generation
  useEffect(() => {
    setForm((prev) => ({ ...prev, employee_id: generateEmployeeId() }));
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/staff", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Teacher added successfully! 🎉");
      router.push(`/school/${slug}/staff`);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to add teacher. Check if Phone is already used.";
      toast.error(typeof msg === "string" ? msg : "Validation error occurred.");
    },
  });

  const handleSubmit = () => {
    if (!form.first_name || !form.phone || !form.date_of_birth || !form.subject) {
      toast.error("Please fill Name, Phone, DOB, and Subject.");
      return;
    }

    if (form.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    const finalSubject =
      form.subject === "Custom (Type below...)" ? form.custom_subject : form.subject;

    if (!finalSubject) {
      toast.error("Please type the custom subject or role (e.g. Dance Teacher).");
      return;
    }

    // Backend payload (Dummy values hidden from user to make form small)
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || ".",
      email: form.email.trim() || undefined,
      phone: form.phone,
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      employee_id: form.employee_id,
      joining_date: new Date().toISOString().split("T")[0],
      staff_type: "teaching",
      employment_type: "permanent",
      extras: {
        designation: "Teacher",
        role: "teacher",
        category: "teaching",
        subjects: finalSubject, 
      },
      // Bypassing complex backend validations
      address_line1: "Not provided",
      city: "Not provided",
      state: "Not provided",
      pincode: "000000",
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 mt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-slate-900 border-slate-700">
              <ArrowLeft className="w-4 h-4 text-white" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-500" />
              Quick Add Teacher
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Add a new teacher instantly without complex forms.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN FORM */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-slate-300">First Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Priya"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Last Name</Label>
            <Input
              placeholder="e.g. Sharma"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Mobile Number <span className="text-red-500">*</span></Label>
            <Input
              placeholder="10-digit mobile number"
              maxLength={10}
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Email Address (Optional)</Label>
            <Input
              type="email"
              placeholder="teacher@school.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-800 pt-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Gender <span className="text-red-500">*</span></Label>
            <Select value={form.gender} onValueChange={(val) => updateField("gender", val)}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label className="text-slate-300">Date of Birth <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={form.date_of_birth}
              onChange={(e) => updateField("date_of_birth", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white block w-full"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Subject / Role <span className="text-red-500">*</span></Label>
            <Select value={form.subject} onValueChange={(val) => updateField("subject", val)}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                <SelectValue placeholder="Select subject..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.subject === "Custom (Type below...)" && (
            <div className="space-y-2 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <Label className="text-blue-400">Custom Role / Subject <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Dance Teacher, Music Coach, Sports Instructor"
                value={form.custom_subject}
                onChange={(e) => updateField("custom_subject", e.target.value)}
                className="bg-slate-950 border-blue-500/50 text-white focus:border-blue-400"
              />
            </div>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 shadow-sm">
        <div className="text-sm text-slate-500">
          ID: <span className="text-slate-300">{form.employee_id}</span>
        </div>
        <div className="flex gap-3">
          <Link href={`/school/${slug}/staff`}>
            <Button variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[150px]"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Add Teacher</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}