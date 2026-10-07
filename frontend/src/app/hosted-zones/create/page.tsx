"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import { createZone } from "@/lib/api";
import { useFlashbar } from "@/components/FlashbarProvider";

export default function CreateHostedZonePage() {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [zoneType, setZoneType] = useState("public");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { flash } = useFlashbar();

  const handleCreate = async () => {
    setNameError("");
    if (!name.trim()) {
      setNameError("Domain name is required");
      return;
    }
    setSubmitting(true);
    try {
      await createZone(name.trim(), comment || undefined, zoneType);
      flash("success", "Hosted zone created");
      router.push("/hosted-zones");
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to create hosted zone");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container header={<h2 style={{ margin: 0 }}>Create hosted zone</h2>}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => router.push("/hosted-zones")}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleCreate}>Create hosted zone</Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <FormField label="Domain name" description="Enter the domain name for the hosted zone." errorText={nameError}>
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" />
          </FormField>
          <FormField label="Description" description="An optional description for the hosted zone.">
            <Textarea value={comment} onChange={({ detail }) => setComment(detail.value)} rows={3} />
          </FormField>
          <FormField label="Type">
            <RadioGroup
              value={zoneType}
              onChange={({ detail }) => setZoneType(detail.value)}
              items={[
                { value: "public", label: "Public hosted zone", description: "Routes traffic for a public domain name." },
                { value: "private", label: "Private hosted zone", description: "Routes traffic within your VPC." },
              ]}
            />
          </FormField>
          <FormField label="Tags" description="Key-value pairs to apply to this resource (mock).">
            <Box variant="code">env=production,team=platform</Box>
          </FormField>
        </SpaceBetween>
      </Form>
    </Container>
  );
}
