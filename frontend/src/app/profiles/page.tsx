"use client";
import { useEffect, useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import { useAuth } from "@/context/AuthContext";

export default function ProfilesPage() {
  const { user } = useAuth();
  const [accountId] = useState(() => "1234-5678-9012");

  return (
    <Container header={<Header variant="h1">Profiles</Header>}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Email</Box>
          <div>{user || "—"}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">Account ID</Box>
          <div>{accountId}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">Region</Box>
          <div>us-east-1 (N. Virginia)</div>
        </div>
        <div>
          <Box variant="awsui-key-label">Plan</Box>
          <div>Free tier</div>
        </div>
      </ColumnLayout>
    </Container>
  );
}
