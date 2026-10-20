"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { createShipmentAction } from "../actions";

type Option = { id: string; label: string };
type Values = {
  factoryId: string;
  buyerId: string;
  forwarderId: string;
  mode: string;
  plannedShipDate: string;
  exFactoryDate: string;
  port: string;
  destination: string;
  vesselOrFlight: string;
  remarks: string;
};

const MODES = ["SEA", "AIR", "ROAD", "COURIER"];

export function ShipmentForm({
  factories,
  buyers,
  forwarders,
}: {
  factories: Option[];
  buyers: Option[];
  forwarders: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<Values>({
    defaultValues: {
      factoryId: "",
      buyerId: "",
      forwarderId: "",
      mode: "SEA",
      plannedShipDate: "",
      exFactoryDate: "",
      port: "",
      destination: "",
      vesselOrFlight: "",
      remarks: "",
    },
  });

  function onSubmit(v: Values) {
    setError("");
    if (!v.factoryId || !v.buyerId || !v.plannedShipDate) {
      setError("Factory, buyer and planned ship date are required");
      return;
    }
    start(async () => {
      const res = await createShipmentAction(v);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/shipments/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Factory" htmlFor="factoryId" required>
              <Select id="factoryId" {...register("factoryId")}>
                <option value="">Select...</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Buyer" htmlFor="buyerId" required>
              <Select id="buyerId" {...register("buyerId")}>
                <option value="">Select...</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Forwarder" htmlFor="forwarderId">
              <Select id="forwarderId" {...register("forwarderId")}>
                <option value="">None</option>
                {forwarders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Mode" htmlFor="mode">
              <Select id="mode" {...register("mode")}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.toLowerCase()}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Planned ship date" htmlFor="plannedShipDate" required>
              <Input id="plannedShipDate" type="date" {...register("plannedShipDate")} />
            </FormField>
            <FormField label="Ex-factory date" htmlFor="exFactoryDate">
              <Input id="exFactoryDate" type="date" {...register("exFactoryDate")} />
            </FormField>
            <FormField label="Port" htmlFor="port">
              <Input id="port" maxLength={100} {...register("port")} />
            </FormField>
            <FormField label="Destination" htmlFor="destination">
              <Input id="destination" maxLength={100} {...register("destination")} />
            </FormField>
            <FormField label="Vessel or flight" htmlFor="vesselOrFlight">
              <Input id="vesselOrFlight" maxLength={100} {...register("vesselOrFlight")} />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="remarks">
            <Input id="remarks" maxLength={500} {...register("remarks")} />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button disabled={pending}>{pending ? "Saving..." : "Create shipment"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}