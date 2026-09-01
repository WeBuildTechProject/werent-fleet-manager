import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#1f2a24",
};

export const container = { maxWidth: "560px", margin: "0 auto", padding: "32px 24px" };
export const logo = { fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" };
export const accent = { color: "#5f8f76" };
export const heading = { fontSize: "20px", margin: "24px 0 12px" };
export const paragraph = { fontSize: "15px", lineHeight: "1.6", margin: "0 0 12px" };
export const divider = { border: "none", borderTop: "1px solid #e6ebe8", margin: "28px 0 12px" };
export const footer = { fontSize: "12px", color: "#6b7a72", margin: 0 };

export function EmailLayout({
  preview,
  title,
  children,
  note,
}: {
  preview: string;
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <Html lang="it" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>
            we<span style={accent}>rent</span>
          </Text>
          <Heading style={heading}>{title}</Heading>
          {children}
          <Hr style={divider} />
          <Text style={footer}>
            {note ??
              "Messaggio di servizio inviato automaticamente dal gestionale We Rent."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
