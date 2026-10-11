"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, X, Plus } from "lucide-react";
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

const SUGGESTED_SUBJECTS = [
  "Mathematics", "Science", "English", "Hindi", "Social Studies", 
  "Physics", "Chemistry", "Biology", "Computer Science", 
  "Physical Education", "Dance", "Music", "Art & Craft"
];

function generateEmployeeId(): string {
  return `EMP${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
}

export default function AddTeacherSmartPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  // Form State
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    gender: "male",
    date_of_birth: "",
    aadhaar_number: "",
    qualification: "",
    experience: "",
    address: "",
    employee_id: "",
  });

  // Smart Subjects State
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");

  // Client side ID generation
  useEffect(() => {
    setForm((prev) => ({ ...prev, employee_id: generateEmployeeId() }));
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // --- Subject Logic ---
  const handleAddSubject = (subjectToAdd: string) => {
    const cleanSub = subjectToAdd.trim();
    if (cleanSub && !subjects.includes(cleanSub)) {
      setSubjects([...subjects, cleanSub]);
    }
    setSubjectInput("");
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    setSubjects(subjects.filter((s) => s !== subjectToRemove));
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubject(subjectInput);
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = SUGGESTED_SUBJECTS.filter(
    (s) =>
      s.toLowerCase().includes(subjectInput.toLowerCase()) &&
      !subjects.includes(s)
  );

  // --- API Mutation ---
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
        "Failed to add teacher. Check if Phone/Aadhaar is already used.";
      toast.error(typeof msg === "string" ? msg : "Validation error occurred.");
    },
  });

  const handleSubmit = () => {
    // Validations
    if (!form.first_name || !form.phone || !form.date_of_birth || subjects.length === 0) {
      toast.error("Please fill Name, Phone, DOB, and add at least one Subject.");
      return;
    }
    if (form.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    if (form.aadhaar_number && form.aadhaar_number.length !== 12) {
      toast.error("Aadhaar number must be exactly 12 digits.");
      return;
    }

    // Backend payload construction
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
      aadhaar_number: form.aadhaar_number || undefined,
      highest_qualification: form.qualification || undefined,
      experience_years: parseInt(form.experience) || 0,
      address_line1: form.address || "Not provided",
      city: "Not provided",
      state: "Not provided",
      pincode: "000000",
      extras: {
        designation: "Teacher",
        role: "teacher",
        category: "teaching",
        subjects: subjects.join(", "), // Array to comma separated string
      },
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-4 pb-12">
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
              Add New Teacher
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Comprehensive staff profile with smart subject selection.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Personal Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 mb-4">
          Personal Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-slate-300">First Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Priya"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Last Name</Label>
            <Input
              placeholder="e.g. Sharma"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Date of Birth <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={form.date_of_birth}
              onChange={(e) => updateField("date_of_birth", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
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
          <div className="space-y-2">
            <Label className="text-slate-300">Aadhaar Number</Label>
            <Input
              placeholder="12-digit number"
              maxLength={12}
              value={form.aadhaar_number}
              onChange={(e) => updateField("aadhaar_number", e.target.value.replace(/\D/g, ""))}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Professional & Subjects (SMART AREA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 mb-4">
          Professional Details & Assignment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Highest Qualification (Degree)</Label>
            <Input
              placeholder="e.g. B.Ed, M.Sc Mathematics"
              value={form.qualification}
              onChange={(e) => updateField("qualification", e.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Experience (in Years)</Label>
            <Input
              placeholder="e.g. 5"
              maxLength={2}
              value={form.experience}
              onChange={(e) => updateField("experience", e.target.value.replace(/\D/g, ""))}
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* SMART SUBJECTS INPUT */}
        <div className="pt-4">
          <Label className="text-slate-300 flex items-center justify-between mb-2">
            <span>Subjects Taught <span className="text-red-500">*</span></span>
            <span className="text-xs text-slate-500 font-normal">Press Enter to add custom subject</span>
          </Label>
          
          <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-4">
            
            {/* Selected Subject Chips */}
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subjects.map((sub, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg">
                    {sub}
                    <button onClick={() => handleRemoveSubject(sub)} className="hover:bg-blue-600/40 p-0.5 rounded-full transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input Field */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a subject... (e.g. Mathematics, Dance)"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={handleSubjectKeyDown}
                className="bg-slate-900 border-slate-700 text-white flex-1"
              />
              <Button 
                variant="secondary" 
                onClick={() => handleAddSubject(subjectInput)}
                disabled={!subjectInput.trim()}
                className="bg-slate-800 hover:bg-slate-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {/* Suggestions Chips */}
            {subjectInput && filteredSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500 w-full mb-1">Suggestions:</span>
                {filteredSuggestions.map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddSubject(sub)}
                    className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-colors"
                  >
                    + {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: Contact & Address */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 mb-4">
          Contact & Address
        </h2>
        
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
        
        <div className="space-y-2">
          <Label className="text-slate-300">Full Address</Label>
          <Input
            placeholder="e.g. 123, School Lane, ABC City"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className="bg-slate-950 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 shadow-xl sticky bottom-4 z-10">
        <div className="text-sm text-slate-500">
          Employee ID: <span className="text-slate-300 font-mono font-medium ml-1">{form.employee_id}</span>
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
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[150px] shadow-lg shadow-blue-500/20"
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