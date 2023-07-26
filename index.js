const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let username = readline.question('Ingresa tu usuario: ');
let password = readline.question('Ingresa tu contraseña: ', {
  hideEchoBack: true
});

const xmpp = client({
  service: "xmpp://alumchat.xyz",
  domain: "alumchat.xyz",
  resource: "example",
  username: username,
  password: password,
});

xmpp.on("error", (err) => {
  console.error(err);
});

xmpp.on("offline", () => {
  console.log("offline");
});

xmpp.on("stanza", async function stanzaHandler(stanza) {
    if (stanza.is("message")) {
        const body = stanza.getChildText("body");
        if (body) {
            console.log(`Nuevo mensaje de: ${stanza.attrs.from}: ${body}\n`);
        }
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
