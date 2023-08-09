const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const getUserInfo = () => {
  let username = readline.question('Enter your username: ');
  let password = readline.question('Enter your password: ', {
    hideEchoBack: true
  });
  return { username, password };
}

const initConnection = (userInfo) => {
  const xmpp = client({
    service: "xmpp://alumchat.xyz",
    domain: "alumchat.xyz",
    resource: "example",
    username: userInfo.username,
    password: userInfo.password,
  });

  xmpp.on("error", (err) => {
    if (err.toString().includes("not-authorized")) { 
        console.log('Incorrect username or password. Try again.\n');
        xmpp.stop().then(() => {
            const newUserInfo = getUserInfo();
            initConnection(newUserInfo);
        });
    }
});

  xmpp.on("stanza", async function stanzaHandler(stanza) {
      if (stanza.is("message")) {
          const body = stanza.getChildText("body");
          if (body) {
              console.log(`New message from ${stanza.attrs.from}: ${body}\n`);
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

  xmpp.start().catch(() => {});
}

initConnection(getUserInfo());
