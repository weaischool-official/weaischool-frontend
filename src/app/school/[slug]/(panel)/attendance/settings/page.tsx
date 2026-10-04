"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  Camera,
  CreditCard,
  Hand,
  QrCode,
  Smartphone,
  Wifi,
  WifiOff,
  Edit,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const METHOD_ICONS: Record<string, React.ElementType> = {
  manual: Hand,
  rfid: CreditCard,
  biometric: Fingerprint,
  face: Camera,
  qr: QrCode,
  mobile: Smartphone,
};

const METHOD_LABELS: Record<string, string> = {
  manual: "Manual Entry",
  rfid: "RFID Card",
  biometric: "Biometric",
  face: "Face Recognition",
  qr: "QR Code",
  mobile: "Mobile App",
};

export default function AttendanceSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`attendance_config_${slug}`);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {}
    }
  }, [slug]);

  const removeDevice = (deviceId: string) => {
    if (!confirm("Remove this device?")) return;
    const updated = {
      ...config,
      devices: config.devices.filter((d: any) => d.id !== deviceId),
    };
    setConfig(updated);
    localStorage.setItem(`attendance_config_${slug}`, JSON.stringify(updated));
    toast.success("Device removed");
  };

  const testDevice = (deviceId: string) => {
    toast.info("Testing device connection... (Coming soon)");
  };

  const resetConfig = () => {
    if (!confirm("Reset all attendance configuration? This will remove all devices and settings.")) return;
    localStorage.removeItem(`attendance_config_${slug}`);
    toast.success("Configuration reset");
    setConfig(null);
  };

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/attendance`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            Attendance Settings
          </h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Configured Yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Run the setup wizard to configure attendance system
          </p>
          <Link href={`/school/${slug}/attendance/setup`}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4" />
              Start Setup Wizard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/school/${slug}/attendance`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-blue-400" />
              Attendance Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage devices and configuration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/school/${slug}/attendance/setup`}>
            <Button variant="outline" className="gap-2">
              <Edit className="w-4 h-4" />
              Reconfigure
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={resetConfig}
            className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </div>

      {/* STUDENT SECTION */}
      {config.trackStudents && (
        <ConfigSection
          title="Students"
          methods={config.studentMethods}
          devices={config.devices.filter((d: any) => d.forStudents)}
          onRemoveDevice={removeDevice}
          onTestDevice={testDevice}
          color="blue"
        />
      )}

      {/* TEACHER SECTION */}
      {config.trackTeachers && (
        <ConfigSection
          title="Teachers"
          methods={config.teacherMethods}
          devices={config.devices.filter((d: any) => d.forTeachers)}
          onRemoveDevice={removeDevice}
          onTestDevice={testDevice}
          color="green"
        />
      )}

      {/* STAFF SECTION */}
      {config.trackStaff && (
        <ConfigSection
          title="Staff"
          methods={config.staffMethods}
          devices={config.devices.filter((d: any) => d.forStaff)}
          onRemoveDevice={removeDevice}
          onTestDevice={testDevice}
          color="orange"
        />
      )}

      {/* RULES */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Rules & Notifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">School Starts</p>
            <p className="font-semibold mt-1">{config.rules.workingHoursStart}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">School Ends</p>
            <p className="font-semibold mt-1">{config.rules.workingHoursEnd}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Late After</p>
            <p className="font-semibold mt-1 text-yellow-400">{config.rules.lateAfter}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Auto-Absent After</p>
            <p className="font-semibold mt-1 text-red-400">{config.rules.autoAbsentAfter}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Parent Notifications:</span>{" "}
            {config.rules.notifyParents ? (
              <span className="text-green-400">Enabled ({config.rules.notifyMethod.toUpperCase()})</span>
            ) : (
              <span className="text-muted-foreground">Disabled</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigSection({
  title,
  methods,
  devices,
  onRemoveDevice,
  onTestDevice,
  color,
}: {
  title: string;
  methods: string[];
  devices: any[];
  onRemoveDevice: (id: string) => void;
  onTestDevice: (id: string) => void;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5",
    green: "border-green-500/30 bg-green-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
  };

  return (
    <div className={`bg-card border-2 rounded-xl p-6 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {methods.length} method{methods.length !== 1 ? "s" : ""} · {devices.length} device{devices.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Methods */}
      <div className="flex flex-wrap gap-2 mb-4">
        {methods.map((method) => {
          const Icon = METHOD_ICONS[method] || Hand;
          return (
            <span
              key={method}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-full text-sm"
            >
              <Icon className="w-4 h-4" />
              {METHOD_LABELS[method]}
            </span>
          );
        })}
      </div>

      {/* Devices */}
      {devices.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Configured Devices:</p>
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between bg-muted/30 border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  device.status === "active" ? "bg-green-500/20" : "bg-gray-500/20"
                }`}>
                  {device.status === "active" ? (
                    <Wifi className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{device.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {device.model} · {device.location}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onTestDevice(device.id)}>
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveDevice(device.id)}
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {methods.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No methods configured yet
        </div>
      )}
    </div>
  );
}