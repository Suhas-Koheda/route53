"use client";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <Container header={<Header variant="h1">{title}</Header>}>
      <Box textAlign="center" padding={{ vertical: "xxxl" }} color="text-status-inactive">
        <Header variant="h2">Coming Soon</Header>
        <p>This feature is under development.</p>
      </Box>
    </Container>
  );
}
