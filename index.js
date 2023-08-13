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
        const contact_username = readline.question('Enter the contact\'s username: ');
        const Iq = xml(
          "iq",
          { type: "set" },
          xml("query", { xmlns: "jabber:iq:roster" }, xml("item", { jid: `${contact_username}@alumchat.xyz` }))
        );
        await xmpp.send(Iq);
        console.log(`Contact ${contact_username} added.\n`);
        break;

      case '3':
        console.log('Not implemented yet.');
        break;

      case '4':
        let receptor = readline.question('Enter the receptor\'s username: ');
        const waitTimeout = 12000;
        exit = false;
        
        const message_stanza = (stanza) => { 
          if (stanza.is("message")) {
            if (!exit) {
              clearTimeout(noMessagesTimeout); 
              const body = stanza.getChildText("body");
              if (body) {
                console.log(`${stanza.attrs.from}: ${body}\n`);
                sendMessage(); 
              }
            }
          }
        };
      
        xmpp.on("stanza", message_stanza);
        let noMessagesTimeout = setTimeout(() => {
          if (!exit){
            console.log('Currently no messages from ' + receptor + '...\n');
            sendMessage();
          }
        }, waitTimeout);
  
        const sendMessage = () => {
          let msg = readline.question('Enter a message: ');        
          if (msg != '') {
            const message = xml(
              "message", { type: "chat", to: `${receptor}@alumchat.xyz` },
              xml("body", {}, msg),
            )
            xmpp.send(message).then(() => { noMessagesTimeout });
          } else {
            exit = true;
            console.log('Exiting one on one chat conversation...\n')
            xmpp.removeListener("stanza", message_stanza);
          }
        };  

        sendMessage();
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
