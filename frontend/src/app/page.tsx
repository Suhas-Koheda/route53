export default function Home() {
  return (
    <div style={{ backgroundColor: "#fff", color: "#16191f" }}>
      <header style={{ backgroundColor: "#0f1b2a", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#ff9900", fontSize: 22, fontWeight: "bold" }}>aws</span>
          <nav style={{ display: "flex", gap: 20, fontSize: 13, alignItems: "center" }}>
            <a href="/login" style={{ color: "#fff", textDecoration: "none" }}>Sign in to console</a>
            <a href="/signup" style={{ border: "1px solid #fff", color: "#fff", padding: "6px 14px", borderRadius: 4, textDecoration: "none" }}>Create account</a>
          </nav>
        </div>
      </header>

      <div style={{ borderBottom: "1px solid #d5dbdb", backgroundColor: "#fafafa" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 32px", display: "flex", gap: 20, fontSize: 13 }}>
          <b>Amazon Route 53</b>
          <a href="/" style={{ color: "#0972d3", textDecoration: "none" }}>Overview</a>
          <a href="#" style={{ color: "#0972d3", textDecoration: "none" }}>Features</a>
          <a href="#" style={{ color: "#0972d3", textDecoration: "none" }}>Pricing</a>
          <a href="#" style={{ color: "#0972d3", textDecoration: "none" }}>Resources</a>
        </div>
      </div>

      <section style={{ backgroundColor: "#0f1b2a", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px" }}>
          <p style={{ fontSize: 14, color: "#aab7b8", marginBottom: 8 }}>Amazon Route 53</p>
          <h1 style={{ fontSize: 40, fontWeight: 700, margin: "0 0 16px" }}>DNS service</h1>
          <p style={{ fontSize: 18, color: "#d5dbdb", maxWidth: 640, marginBottom: 32 }}>
            A reliable and cost-effective way to route end users to Internet applications
          </p>
          <a href="/hosted-zones" style={{ backgroundColor: "#ec7211", color: "#fff", padding: "14px 28px", borderRadius: 4, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
            Get started with Route 53
          </a>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Benefits of Route 53</h2>
        {[
          ["Route end users to your site reliably with globally-dispersed DNS servers and automatic scaling.", "Amazon Route 53 ensures reliable and efficient routing of end users to your website by leveraging globally-dispersed Domain Name System (DNS) servers. With automatic scaling, the service dynamically adjusts to varying workloads."],
          ["Set up your DNS routing in minutes with domain name registration and straightforward visual traffic flow tools.", "Amazon Route 53 streamlines the setup of DNS routing by providing quick and easy domain name registration, complemented by straightforward visual traffic flow tools."],
          ["Customize your DNS routing policies to reduce latency, improve application availability, and maintain compliance.", "Amazon Route 53 allows users to tailor DNS routing policies to specific needs, such as reducing latency, enhancing application availability, and ensuring compliance."],
        ].map(([h, p]) => (
          <div key={h} style={{ marginBottom: 24, maxWidth: 800 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{h}</h3>
            <p style={{ color: "#545b64", lineHeight: 1.6 }}>{p}</p>
          </div>
        ))}
      </section>

      <section style={{ backgroundColor: "#f2f3f3" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>How it works</h2>
          <p style={{ color: "#16191f", lineHeight: 1.7, maxWidth: 900 }}>
            Amazon Route 53 provides highly available and scalable Domain Name System (DNS), domain name registration,
            and health-checking cloud services. It gives developers and businesses an extremely reliable and cost-effective
            way to route end users to internet applications by translating names like example.com into the numeric IP
            addresses, such as 192.0.2.1, that computers use to connect to each other.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Use cases</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            ["Manage network traffic globally", "Create, visualize, and scale complex routing relationships between records and policies."],
            ["Build highly available applications", "Set routing policies to pre-determine and automate responses in case of failure."],
            ["Set up private DNS", "Assign and access custom domain names in your VPC without exposing DNS data."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t}</h3>
              <p style={{ color: "#545b64" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ backgroundColor: "#16191f", color: "#aab7b8" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24 }}>
          {[
            ["Learn", ["What Is AWS?", "What Is Cloud Computing?", "AWS Cloud Security"]],
            ["Resources", ["Getting Started", "Training", "AWS Trust Center"]],
            ["Developers", ["Builder Center", "SDKs & Tools", "AWS Blogs"]],
            ["Help", ["Contact Us", "Support", "AWS re:Post"]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 style={{ color: "#fff", marginBottom: 12 }}>{title as string}</h4>
              {(links as string[]).map((l) => (
                <p key={l} style={{ fontSize: 13, marginBottom: 8 }}>{l}</p>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #2a3644", padding: "16px 32px", textAlign: "center", fontSize: 12 }}>
          © 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved. Demo clone — not affiliated with AWS.
        </div>
      </footer>
    </div>
  );
}
