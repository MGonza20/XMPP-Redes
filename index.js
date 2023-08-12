const { client, xml } = require("@xmpp/client");
const readline = require('readline-sync');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const getUserInfo = () => {
  // let username = readline.question('Enter your username: ');
  // let password = readline.question('Enter your password: ', {
  //   hideEchoBack: true
  // });
  let username = 'pag20634';
  let password = '1234';
  return { username, password };
}

const showMenuOptions = () => {
  console.log('\n--------------------   Menu   --------------------\n1. Mostrar todos los usuarios/contactos y su estado\n2. Agregar un usuario a los contactos\n3. Mostrar detalles de contacto de un usuario\n4. Comunicacion 1 a 1 con cualquier usuario/contacto\n5. Participar en conversaciones grupales\n6. Definir mensaje de presencia\n7. Enviar/recibir notificaciones\n8. Enviar/recibir archivo\n')
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



  xmpp.on("online", async () => {
    await xmpp.send(xml("presence"));

    showMenuOptions()

    let selectedOption = readline.question('Select a menu option: ');
    switch (selectedOption) {
      case '1':
        console.log('Not implemented yet.');
        break;

      case '2':
        console.log('Not implemented yet.');
        break;

      case '3':
        console.log('Not implemented yet.');
        break;

      case '4':
        receptor = readline.question('Enter the receptor\'s username: ');
        msg = readline.question('Enter the message: ');
        const message = xml(
          "message",
          { type: "chat", to: `${receptor}@alumchat.xyz`},
          xml("body", {}, msg ),
        );
        await xmpp.send(message);
        
        // xmpp.on("stanza", async function stanzaHandler(stanza) {
        //   if (stanza.is("message")) {
        //       const body = stanza.getChildText("body");
        //       if (body) {
        //           console.log(`${stanza.attrs.from}: ${body}\n`);
        //       }
        //   }
        // });  

        break;

      case '5':
        console.log('Not implemented yet.');
        break;

      case '6':
        console.log('Not implemented yet.');
        break;

      case '7':
        console.log('Not implemented yet.');
        break;

      case '8':
        console.log('Not implemented yet.');
        break;
        
      default:
        console.log('Invalid option. Try again.\n');
    }
  });
  xmpp.start().catch(() => {});
}

initConnection(getUserInfo());
