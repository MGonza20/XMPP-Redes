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
  console.log('\n--------------------   Menu   --------------------\n1. Show contacts and status\n2. Add user to contacts\n3. Mostrar detalles de contacto de un usuario\n4. Chat one to one with user\n5. Participar en conversaciones grupales\n6. Definir mensaje de presencia\n7. Enviar/recibir notificaciones\n8. Enviar/recibir archivo\n')
}

const initConnection = (userInfo) => {

  // global variables
  let showContactsStatus = false;
  let showContactsListTitle = false;
  let showGroupMessages = false;

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

  xmpp.on("stanza", (stanza) => {
    if (stanza.is("presence")) {
      if (showContactsStatus){
        if (!showContactsListTitle) {
          console.log('\nCONTACTS LIST: \n')
          showContactsListTitle = true;
        }
        const user = stanza.attrs.from.split('@')[0];
        const status = stanza.getChildText("status");
        console.log(`USER: ${user} \nSTATUS: ${status || "No status"}\n`);
      }
    }
  });
  
  xmpp.on("online", async () => {
    await xmpp.send(xml("presence"));

    showMenuOptions()

    let selectedOption = readline.question('Select a menu option: ');
    switch (selectedOption) {
      case '1':
        showContactsStatus = true;
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
                console.log(`${stanza.attrs.from}: ${body}`);
                sendMessage(); 
              }
            }
          }
        };
      
        xmpp.on("stanza", message_stanza);
        let noMessagesTimeout = setTimeout(() => {
          if (!exit){
            console.log('Currently no messages from ' + receptor + '...');
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
            clearTimeout(noMessagesTimeout); 
            noMessagesTimeout = setTimeout(() => {
              if (!exit){
                console.log('Currently no messages from ' + receptor + '...');
                sendMessage();
              }
            }, waitTimeout);
          } else {
            exit = true;
            console.log('Exiting one on one chat conversation...\n')
            xmpp.removeListener("stanza", message_stanza);
          }
        };  

        sendMessage();
        break;

        case '5':
          const groupChat = readline.question('Enter the group chat name: ');
          const nickname = readline.question('Enter your nickname for this group: ');      
          const groupJid = `${groupChat}@conference.alumchat.xyz/${nickname}`;
      
          const presence = xml("presence", { to: groupJid });
          await xmpp.send(presence);
      
          const groupMessageStanza = (stanza) => {
            if (stanza.is("message") && stanza.attrs.type === "groupchat") {
              const from = stanza.attrs.from.split('/')[1];
              const body = stanza.getChildText("body");
              if (body) {
                console.log(`${from}: ${body}`);
              }
            }
          };
      
          xmpp.on("stanza", groupMessageStanza);
      
          let exitGroupChat = false;
          while (!exitGroupChat) {
            let msgGC = readline.question('Enter your message for the room (or press enter to exit): ');
            if (msgGC === '') {
              exitGroupChat = true;
              const exitPresence = xml("presence", { to: groupJid, type: "unavailable" });
              await xmpp.send(exitPresence);
              xmpp.removeListener("stanza", groupMessageStanza);
              console.log('Exiting group chat...\n');
            } else {
              const message = xml(
                "message", { type: "groupchat", to: `${groupChat}@conference.alumchat.xyz` },
                xml("body", {}, msgGC),
              );
              await xmpp.send(message);
            }
          }
      
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
