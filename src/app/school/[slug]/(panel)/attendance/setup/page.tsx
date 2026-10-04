"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  GraduationCap,
  Briefcase,
  Sparkles,
  Hand,
  Fingerprint,
  Camera,
  CreditCard,
  QrCode,
  Smartphone,
  Settings,
  CheckCircle2,
  Clock,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════

const METHODS = [
  {
    id: "manual",
    label: "Manual Entry",
    description: "Teacher marks attendance in web app",
    icon: Hand,
    cost: "Free",
    setup: "None required",
    recommended: true,
    color: "green",
  },
  {
    id: "rfid",
    label: "RFID Card Reader",
    description: "Students tap ID cards on scanner",
    icon: CreditCard,
    cost: "₹1,500 device + ₹10/card",
    setup: "30 minutes",
    color: "blue",
  },
  {
    id: "biometric",
    label: "Biometric (Fingerprint)",
    description: "ZKTeco / eSSL fingerprint machine",
    icon: Fingerprint,
    cost: "₹6,000 - ₹15,000",
    setup: "1-2 hours",
    color: "purple",
  },
  {
    id: "face",
    label: "AI Face Recognition",
    description: "Camera/webcam based, no hardware needed",
    icon: Camera,
    cost: "Free (browser) or ₹500/month (cloud)",
    setup: "15 minutes",
    color: "pink",
  },
  {
    id: "qr",
    label: "QR Code",
    description: "Students scan personal QR from phone",
    icon: QrCode,
    cost: "Free",
    setup: "5 minutes",
    color: "yellow",
  },
  {
    id: "mobile",
    label: "Mobile App",
    description: "Teachers/students mark from phone",
    icon: Smartphone,
    cost: "Free",
    setup: "Coming soon",
    disabled: true,
    color: "gray",
  },
];

const DEVICE_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  biometric: [
    { value: "zkteco_k40", label: "ZKTeco K40" },
    { value: "zkteco_f18", label: "ZKTeco F18" },
    { value: "essl_x990", label: "eSSL X990" },
    { value: "essl_k21", label: "eSSL K21 Pro" },
    { value: "realtime_t52", label: "Realtime T52" },
    { value: "mantra_mfs100", label: "Mantra MFS100" },
    { value: "other", label: "Other" },
  ],
  rfid: [
    { value: "usb_reader", label: "USB Card Reader" },
    { value: "standalone", label: "Standalone Device" },
    { value: "barcode", label: "Barcode Scanner" },
    { value: "other", label: "Other" },
  ],
  face: [
    { value: "webcam_browser", label: "Browser Webcam (face-api.js)" },
    { value: "aws_rekognition", label: "AWS Rekognition (Cloud)" },
    { value: "compreface", label: "CompreFace (Self-hosted)" },
    { value: "cctv_rtsp", label: "CCTV Camera (RTSP)" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AttendanceConfig {
  trackStudents: boolean;
  trackTeachers: boolean;
  trackStaff: boolean;
  studentMethods: string[];
  teacherMethods: string[];
  staffMethods: string[];
  devices: DeviceConfig[];
  rules: {
    workingHoursStart: string;
    workingHoursEnd: string;
    lateAfter: string;
    autoAbsentAfter: string;
    notifyParents: boolean;
    notifyMethod: string;
  };
  isConfigured: boolean;
  setupCompletedAt?: string;
}

interface DeviceConfig {
  id: string;
  name: string;
  type: string;
  model: string;
  forStudents: boolean;
  forTeachers: boolean;
  forStaff: boolean;
  connectionType: string;
  ipAddress?: string;
  port?: string;
  apiKey?: string;
  webhookUrl?: string;
  location: string;
  status: "active" | "inactive";
}

const DEFAULT_CONFIG: AttendanceConfig = {
  trackStudents: true,
  trackTeachers: true,
  trackStaff: false,
  studentMethods: [],
  teacherMethods: [],
  staffMethods: [],
  devices: [],
  rules: {
    workingHoursStart: "08:00",
    workingHoursEnd: "16:00",
    lateAfter: "08:30",
    autoAbsentAfter: "10:00",
    notifyParents: true,
    notifyMethod: "sms",
  },
  isConfigured: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AttendanceSetupWizard() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);
  const [currentRoleConfig, setCurrentRoleConfig] = useState<"students" | "teachers" | "staff">("students");

  // Load existing config if any
  useEffect(() => {
    const saved = localStorage.getItem(`attendance_config_${slug}`);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {}
    }
  }, [slug]);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // ── Step Navigation ──
  const nextStep = () => {
    if (step === 1) {
      if (!config.trackStudents && !config.trackTeachers && !config.trackStaff) {
        toast.error("Please select at least one category to track");
        return;
      }
    }
    if (step === 2) {
      if (config.trackStudents && config.studentMethods.length === 0) {
        toast.error("Please select at least one method for students");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // ── Toggle Methods ──
  const toggleMethod = (role: "students" | "teachers" | "staff", methodId: string) => {
    const key = `${role.slice(0, -1)}Methods` as "studentMethods" | "teacherMethods" | "staffMethods";
    setConfig((prev) => {
      const current = prev[key];
      const updated = current.includes(methodId)
        ? current.filter((m) => m !== methodId)
        : [...current, methodId];
      return { ...prev, [key]: updated };
    });
  };

  // ── Complete Setup ──
  const completeSetup = () => {
    const finalConfig: AttendanceConfig = {
      ...config,
      isConfigured: true,
      setupCompletedAt: new Date().toISOString(),
    };
    localStorage.setItem(`attendance_config_${slug}`, JSON.stringify(finalConfig));
    toast.success("Attendance system configured successfully! 🎉");
    setTimeout(() => {
      router.push(`/school/${slug}/attendance`);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link href={`/school/${slug}/attendance`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            Attendance Setup Wizard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure attendance system for your school
          </p>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {step} of {totalSteps}</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span className={step >= 1 ? "text-blue-400 font-medium" : ""}>1. People</span>
          <span className={step >= 2 ? "text-blue-400 font-medium" : ""}>2. Methods</span>
          <span className={step >= 3 ? "text-blue-400 font-medium" : ""}>3. Devices</span>
          <span className={step >= 4 ? "text-blue-400 font-medium" : ""}>4. Rules</span>
          <span className={step >= 5 ? "text-blue-400 font-medium" : ""}>5. Review</span>
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* ═══ STEP 1: People to Track ═══ */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Who to Track?</h2>
              <p className="text-sm text-muted-foreground">
                Select which categories you want to track attendance for
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PeopleCard
                icon={GraduationCap}
                label="Students"
                description="Track daily student attendance"
                selected={config.trackStudents}
                onClick={() => setConfig({ ...config, trackStudents: !config.trackStudents })}
                color="blue"
              />
              <PeopleCard
                icon={Users}
                label="Teachers"
                description="Track teaching staff attendance"
                selected={config.trackTeachers}
                onClick={() => setConfig({ ...config, trackTeachers: !config.trackTeachers })}
                color="green"
              />
              <PeopleCard
                icon={Briefcase}
                label="Staff"
                description="Peon, guards, drivers, cleaners"
                selected={config.trackStaff}
                onClick={() => setConfig({ ...config, trackStaff: !config.trackStaff })}
                color="orange"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
              💡 <strong>Tip:</strong> You can enable more categories later from Settings
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Choose Methods ═══ */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Choose Attendance Methods</h2>
              <p className="text-sm text-muted-foreground">
                Select one or more methods for each category
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="flex gap-2 border-b border-border">
              {config.trackStudents && (
                <RoleTab
                  active={currentRoleConfig === "students"}
                  onClick={() => setCurrentRoleConfig("students")}
                  label="Students"
                  count={config.studentMethods.length}
                />
              )}
              {config.trackTeachers && (
                <RoleTab
                  active={currentRoleConfig === "teachers"}
                  onClick={() => setCurrentRoleConfig("teachers")}
                  label="Teachers"
                  count={config.teacherMethods.length}
                />
              )}
              {config.trackStaff && (
                <RoleTab
                  active={currentRoleConfig === "staff"}
                  onClick={() => setCurrentRoleConfig("staff")}
                  label="Staff"
                  count={config.staffMethods.length}
                />
              )}
            </div>

            {/* Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {METHODS.map((method) => {
                const key = `${currentRoleConfig.slice(0, -1)}Methods` as
                  | "studentMethods"
                  | "teacherMethods"
                  | "staffMethods";
                const isSelected = config[key].includes(method.id);
                return (
                  <MethodCard
                    key={method.id}
                    method={method}
                    selected={isSelected}
                    onClick={() => !method.disabled && toggleMethod(currentRoleConfig, method.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Devices ═══ */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Configure Devices</h2>
              <p className="text-sm text-muted-foreground">
                Add devices for automated attendance (skip if using manual only)
              </p>
            </div>

            {/* Show if only manual is selected */}
            {config.studentMethods.every((m) => m === "manual") &&
              config.teacherMethods.every((m) => m === "manual") &&
              config.staffMethods.every((m) => m === "manual") ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Devices Needed!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You&apos;ve chosen Manual Entry only. No hardware setup required.
                </p>
                <p className="text-xs text-muted-foreground">
                  You can add devices later from Settings.
                </p>
              </div>
            ) : (
              <>
                {/* Device Configuration Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    🔧 <strong>Device Setup:</strong> Configure each device below. Auto-generated webhook URLs and API keys will be shown for device integration.
                  </p>
                </div>

                {/* Device configuration UI */}
                <div className="space-y-4">
                  {[
                    ...config.studentMethods.filter((m) => m !== "manual" && m !== "qr" && m !== "mobile"),
                    ...config.teacherMethods.filter((m) => m !== "manual" && m !== "qr" && m !== "mobile"),
                    ...config.staffMethods.filter((m) => m !== "manual" && m !== "qr" && m !== "mobile"),
                  ]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map((methodId) => {
                      const method = METHODS.find((m) => m.id === methodId);
                      if (!method) return null;
                      return (
                        <DeviceConfigCard
                          key={methodId}
                          method={method}
                          onSave={(device) => {
                            setConfig({
                              ...config,
                              devices: [...config.devices, device],
                            });
                            toast.success(`${method.label} configured!`);
                          }}
                        />
                      );
                    })}
                </div>

                {config.devices.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Configured Devices ({config.devices.length})</p>
                    <div className="space-y-2">
                      {config.devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-sm">{device.name}</p>
                            <p className="text-xs text-muted-foreground">{device.model} • {device.location}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfig({
                                ...config,
                                devices: config.devices.filter((d) => d.id !== device.id),
                              })
                            }
                            className="text-red-400"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Rules & Notifications ═══ */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Rules & Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Set working hours and notification preferences
              </p>
            </div>

            {/* Working Hours */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Working Hours
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>School Starts At</Label>
                  <Input
                    type="time"
                    value={config.rules.workingHoursStart}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rules: { ...config.rules, workingHoursStart: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>School Ends At</Label>
                  <Input
                    type="time"
                    value={config.rules.workingHoursEnd}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rules: { ...config.rules, workingHoursEnd: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Late/Absent Rules */}
            <div className="space-y-3">
              <h3 className="font-medium">Late & Absent Rules</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Mark Late After</Label>
                  <Input
                    type="time"
                    value={config.rules.lateAfter}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rules: { ...config.rules, lateAfter: e.target.value },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Students arriving after this = Late</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Auto-Absent After</Label>
                  <Input
                    type="time"
                    value={config.rules.autoAbsentAfter}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rules: { ...config.rules, autoAbsentAfter: e.target.value },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">No check-in by this = Absent</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Parent Notifications
              </h3>
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium">Notify parents when child is absent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-send SMS/WhatsApp to parents
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      rules: { ...config.rules, notifyParents: !config.rules.notifyParents },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.rules.notifyParents ? "bg-green-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.rules.notifyParents ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {config.rules.notifyParents && (
                <div className="space-y-1.5">
                  <Label>Notification Method</Label>
                  <select
                    value={config.rules.notifyMethod}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rules: { ...config.rules, notifyMethod: e.target.value },
                      })
                    }
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="sms">SMS Only</option>
                    <option value="whatsapp">WhatsApp Only</option>
                    <option value="both">SMS + WhatsApp</option>
                    <option value="email">Email Only</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    💡 SMS/WhatsApp integration requires API keys (setup in Settings later)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 5: Review & Confirm ═══ */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1">Review Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Verify your setup and complete configuration
              </p>
            </div>

            <div className="space-y-4">
              {/* People Tracked */}
              <ReviewSection title="People Tracked">
                <div className="flex flex-wrap gap-2">
                  {config.trackStudents && <Badge color="blue">🎓 Students</Badge>}
                  {config.trackTeachers && <Badge color="green">👨‍🏫 Teachers</Badge>}
                  {config.trackStaff && <Badge color="orange">💼 Staff</Badge>}
                </div>
              </ReviewSection>

              {/* Methods */}
              {config.trackStudents && (
                <ReviewSection title="Student Methods">
                  <div className="flex flex-wrap gap-2">
                    {config.studentMethods.map((m) => {
                      const method = METHODS.find((x) => x.id === m);
                      return method ? <Badge key={m} color="blue">{method.label}</Badge> : null;
                    })}
                  </div>
                </ReviewSection>
              )}
              {config.trackTeachers && (
                <ReviewSection title="Teacher Methods">
                  <div className="flex flex-wrap gap-2">
                    {config.teacherMethods.map((m) => {
                      const method = METHODS.find((x) => x.id === m);
                      return method ? <Badge key={m} color="green">{method.label}</Badge> : null;
                    })}
                  </div>
                </ReviewSection>
              )}
              {config.trackStaff && (
                <ReviewSection title="Staff Methods">
                  <div className="flex flex-wrap gap-2">
                    {config.staffMethods.map((m) => {
                      const method = METHODS.find((x) => x.id === m);
                      return method ? <Badge key={m} color="orange">{method.label}</Badge> : null;
                    })}
                  </div>
                </ReviewSection>
              )}

              {/* Devices */}
              {config.devices.length > 0 && (
                <ReviewSection title={`Devices (${config.devices.length})`}>
                  <div className="space-y-1">
                    {config.devices.map((d) => (
                      <div key={d.id} className="text-sm">
                        • {d.name} — {d.model}
                      </div>
                    ))}
                  </div>
                </ReviewSection>
              )}

              {/* Rules */}
              <ReviewSection title="Rules">
                <div className="text-sm space-y-1">
                  <div>School Hours: {config.rules.workingHoursStart} - {config.rules.workingHoursEnd}</div>
                  <div>Late After: {config.rules.lateAfter}</div>
                  <div>Auto-Absent After: {config.rules.autoAbsentAfter}</div>
                  <div>Notify Parents: {config.rules.notifyParents ? `Yes (${config.rules.notifyMethod})` : "No"}</div>
                </div>
              </ReviewSection>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-300">
              ✅ <strong>Ready to activate!</strong> Click Complete Setup to save your configuration and start marking attendance.
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {step} of {totalSteps}
        </div>

        {step < totalSteps ? (
          <Button onClick={nextStep} className="gap-2 bg-blue-600 hover:bg-blue-700">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={completeSetup} className="gap-2 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Complete Setup
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function PeopleCard({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: selected ? "border-blue-500 bg-blue-500/20" : "border-border hover:border-blue-500/50",
    green: selected ? "border-green-500 bg-green-500/20" : "border-border hover:border-green-500/50",
    orange: selected ? "border-orange-500 bg-orange-500/20" : "border-border hover:border-orange-500/50",
  };
  return (
    <button
      onClick={onClick}
      className={`p-5 border-2 rounded-xl transition-all text-left relative ${colors[color]}`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      <Icon className={`w-8 h-8 mb-3 ${selected ? "text-white" : "text-muted-foreground"}`} />
      <h3 className="font-semibold text-lg mb-1">{label}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function RoleTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border-b-2 transition-colors font-medium text-sm
        ${active ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label} <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">{count}</span>
    </button>
  );
}

function MethodCard({
  method,
  selected,
  onClick,
}: {
  method: typeof METHODS[0];
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = method.icon;
  return (
    <button
      onClick={onClick}
      disabled={method.disabled}
      className={`p-4 border-2 rounded-xl transition-all text-left relative
        ${selected ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"}
        ${method.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      {method.recommended && !selected && (
        <span className="absolute top-2 right-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
          Recommended
        </span>
      )}
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 mt-1 shrink-0 ${selected ? "text-blue-400" : "text-muted-foreground"}`} />
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{method.label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-green-400">💰 {method.cost}</span>
            <span className="text-muted-foreground">⏱️ {method.setup}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DeviceConfigCard({
  method,
  onSave,
}: {
  method: typeof METHODS[0];
  onSave: (device: DeviceConfig) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [device, setDevice] = useState<Partial<DeviceConfig>>({
    id: `dev_${Date.now()}`,
    name: "",
    type: method.id,
    model: DEVICE_MODELS[method.id]?.[0]?.value || "",
    forStudents: true,
    forTeachers: false,
    forStaff: false,
    connectionType: "cloud_push",
    location: "",
    status: "active",
    apiKey: `key_${Math.random().toString(36).substring(2, 15)}`,
    webhookUrl: `https://api.weaischool.com/webhooks/attendance/${Date.now()}`,
  });
  const Icon = method.icon;

  const handleSave = () => {
    if (!device.name || !device.location) {
      toast.error("Please fill device name and location");
      return;
    }
    onSave(device as DeviceConfig);
    setShowForm(false);
    setDevice({
      id: `dev_${Date.now()}`,
      name: "",
      type: method.id,
      model: DEVICE_MODELS[method.id]?.[0]?.value || "",
      forStudents: true,
      forTeachers: false,
      forStaff: false,
      connectionType: "cloud_push",
      location: "",
      status: "active",
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-400" />
          <div>
            <h4 className="font-semibold text-sm">{method.label}</h4>
            <p className="text-xs text-muted-foreground">Click to configure device</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? "Cancel" : "+ Configure"}
        </Button>
      </div>

      {showForm && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Device Name *</Label>
              <Input
                placeholder="e.g. Main Gate Reader"
                value={device.name}
                onChange={(e) => setDevice({ ...device, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <select
                value={device.model}
                onChange={(e) => setDevice({ ...device, model: e.target.value })}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DEVICE_MODELS[method.id]?.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input
                placeholder="e.g. Main Entrance, Room 201"
                value={device.location}
                onChange={(e) => setDevice({ ...device, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Connection Type</Label>
              <select
                value={device.connectionType}
                onChange={(e) => setDevice({ ...device, connectionType: e.target.value })}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cloud_push">Cloud Push (Device → Server)</option>
                <option value="direct_poll">Direct Poll (Server → Device)</option>
                <option value="sdk">SDK Integration</option>
              </select>
            </div>
            {device.connectionType === "direct_poll" && (
              <>
                <div className="space-y-1.5">
                  <Label>IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={device.ipAddress || ""}
                    onChange={(e) => setDevice({ ...device, ipAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input
                    placeholder="4370"
                    value={device.port || ""}
                    onChange={(e) => setDevice({ ...device, port: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Auto-generated credentials */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-300">🔐 Auto-Generated Credentials</p>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">API Key:</span>{" "}
                <code className="text-blue-300">{device.apiKey}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Webhook URL:</span>{" "}
                <code className="text-blue-300 break-all">{device.webhookUrl}</code>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Give these to your device installer to configure the device
            </p>
          </div>

          {/* Applies to */}
          <div>
            <Label className="mb-2 block">This device is for:</Label>
            <div className="flex gap-2">
              <ToggleButton
                label="Students"
                active={device.forStudents}
                onClick={() => setDevice({ ...device, forStudents: !device.forStudents })}
              />
              <ToggleButton
                label="Teachers"
                active={device.forTeachers}
                onClick={() => setDevice({ ...device, forTeachers: !device.forTeachers })}
              />
              <ToggleButton
                label="Staff"
                active={device.forStaff}
                onClick={() => setDevice({ ...device, forStaff: !device.forStaff })}
              />
            </div>
          </div>

          <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save Device
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
        ${active ? "bg-blue-500/20 border-blue-500 text-blue-400" : "border-border text-muted-foreground hover:border-blue-500/50"}`}
    >
      {active ? "✓ " : ""}{label}
    </button>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}