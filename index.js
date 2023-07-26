const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const xmpp = client({
  service: "xmpp://alumchat.xyz",
  domain: "alumchat.xyz",
  resource: "example",
  username: "test",
  password: "1234",
});

debug(xmpp, true);

xmpp.on("error", (err) => {
  console.error(err);
});

xmpp.on("offline", () => {
  console.log("offline");
});

xmpp.on("stanza", async function stanzaHandler(stanza) {
    if (stanza.is("message")) {
        xmpp.off("stanza", stanzaHandler);
        await xmpp.send(xml("presence", { type: "unavailable" }));
        await xmpp.stop();
    }
});  

xmpp.on("online", async (address) => {
  await xmpp.send(xml("presence"));
  const message = xml(
    "message",
    { type: "chat", to: address },
    xml("body", {}, "hello world"),
  );
  await xmpp.send(message);
});

xmpp.start().catch(console.error);