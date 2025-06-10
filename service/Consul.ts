import { networkInterfaces } from "os";
import { CONSUL_URL, CONSUL_SERVICE_NAME, PORT } from "../config";

const net = networkInterfaces();

const hostname = net["eth0"] ? net["eth0"][0].address : "localhost";

console.log(hostname);

const serviceDefinition = {
  ID: `${CONSUL_SERVICE_NAME}-${process.pid}-${hostname}`,
  Name: CONSUL_SERVICE_NAME,
  Address: hostname,
  Port: parseInt(PORT),
  Check: {
    HTTP: `http://${hostname}:${PORT}/health`,
    Interval: "10s",
    Timeout: "5s",
  },
};

console.log();

export async function registerService() {
  try {
    const response = await fetch(`${CONSUL_URL}/v1/agent/service/register`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceDefinition),
    });

    if (response.ok) {
      console.log("Service successfully registered with Consul");
    } else {
      console.error("Error registering service:", await response.text());
    }
  } catch (err) {
    console.error("Error connecting to Consul:", err);
  }

  // Deregister on shutdown
  process.on("SIGINT", async () => {
    console.log("Unregistering service from Consul...");

    try {
      const response = await fetch(
        `${CONSUL_URL}/v1/agent/service/deregister/${serviceDefinition.ID}`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        console.log("Service successfully unregistered from Consul");
      } else {
        console.error("Error unregistering service:", await response.text());
      }
    } catch (err) {
      console.error("Error connecting to Consul:", err);
    }

    process.exit();
  });
}