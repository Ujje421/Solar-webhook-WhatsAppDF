import { logger } from '../utils/logging.js';
import {
  markAsRead,
  sendWatsAppReplyText,
  sendWatsAppWithButtons,
  sendWatsAppWithList
} from '../whatsApp/whatsAppAPI.js';

import { getSession, saveSession, deleteSession } from '../Services/redis/redisWASession.js';
import { getActionFromDFES } from '../Services/Dialogflow/detectIntentES.js';
import { DFchipsToButtonOrList } from '../whatsApp/DFchipsToButtons.js';

import {
  calculateSystemSize,
  calculatePrice,
  calculateSubsidy
} from '../Solar/solarCalculator.js';

/* ---------------- SOLAR MENU ---------------- */

const solarMenu = {
  button: "Solar Options",
  sections: [
    {
      title: "Solar Services",
      rows: [
        {
          id: "SOLAR_QUOTE",
          title: "Get Solar Quotation",
          description: "Estimate system size & price"
        },
        {
          id: "SOLAR_SUBSIDY",
          title: "Solar Subsidy",
          description: "Government subsidy information"
        },
        {
          id: "SITE_VISIT",
          title: "Free Site Visit",
          description: "Book rooftop inspection"
        }
      ]
    }
  ]
};

/* ---------------- INTERACTIVE HANDLER ---------------- */

const handleInteractiveButtons = async (message, from, phone_number_id) => {
  switch (message.interactive.type) {
    case 'button_reply':
      message.text = { body: message.interactive.button_reply.id };
      break;
    case 'list_reply':
      message.text = { body: message.interactive.list_reply.title };
      break;
    default:
      return;
  }

  await handleTextMessage(message, from, phone_number_id);
};

/* ---------------- TEXT HANDLER ---------------- */

const handleTextMessage = async (message, from, phone_number_id) => {
  try {
    markAsRead(message.id, phone_number_id);

    // Restart command
    if (message.text?.body?.toUpperCase() === 'RESTART') {
      await deleteSession(from);
      sendWatsAppWithList(
        "Welcome to Solar Assistant ☀️\nHow can I help you today?",
        solarMenu,
        "Solar Services",
        "SolarBot",
        from,
        phone_number_id
      );
      return;
    }

    // Call Dialogflow ES
    const DFResponse = await getActionFromDFES(message.text.body, from);

    // Normal Dialogflow reply
    if (DFResponse.fulfillmentText) {
      sendWatsAppReplyText(DFResponse.fulfillmentText, from, phone_number_id);
    }

    // Handle Solar Quote Payload
    if (DFResponse.payload && DFResponse.payload.monthlyBill) {
      const bill = Number(DFResponse.payload.monthlyBill);

      const systemSize = calculateSystemSize(bill);
      const price = calculatePrice(systemSize);
      const subsidy = calculateSubsidy(systemSize);
      const finalPrice = price - subsidy;

      sendWatsAppReplyText(
`🔆 *Your Solar Estimate*

⚡ Recommended System: *${systemSize} kW*

💰 Price: ₹${price}
🏷 Government Subsidy: ₹${subsidy}
✅ Final Cost: ₹${finalPrice}

Reply:
1️⃣ Quotation PDF
2️⃣ Free Site Visit
3️⃣ Talk to Solar Expert`,
        from,
        phone_number_id
      );
      return;
    }

    // Handle suggestion chips / buttons
    if (DFResponse.payload) {
      const options = DFchipsToButtonOrList(DFResponse.payload);

      if (options?.button) {
        sendWatsAppWithList(
          DFResponse.fulfillmentText || "Please choose an option",
          options,
          "",
          "",
          from,
          phone_number_id
        );
        return;
      }

      if (Array.isArray(options) && options.length > 0) {
        sendWatsAppWithButtons(
          DFResponse.fulfillmentText || "Please choose an option",
          options,
          "",
          from,
          phone_number_id
        );
        return;
      }
    }

    // If nothing matched → show solar menu
    if (!DFResponse.fulfillmentText && !DFResponse.payload) {
      sendWatsAppWithList(
        "Welcome to Solar Assistant ☀️\nHow can I help you today?",
        solarMenu,
        "Solar Services",
        "SolarBot",
        from,
        phone_number_id
      );
    }

  } catch (error) {
    logger.error(error);
    sendWatsAppReplyText(
      "Sorry, something went wrong. Please try again.",
      from,
      phone_number_id
    );
  }
};

/* ---------------- MAIN ANALYZER ---------------- */

const AnalyzeMessage = async (req, res) => {
  try {
    const message = req.body.entry[0].changes[0].value.messages[0];
    const phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id;

    switch (message.type) {
      case 'text':
        await handleTextMessage(message, message.from, phone_number_id);
        break;
      case 'interactive':
        await handleInteractiveButtons(message, message.from, phone_number_id);
        break;
      default:
        break;
    }
  } catch (error) {
    logger.error(error);
  }
};

/* ---------------- WEBHOOK ENTRY ---------------- */

export const getWhatsAppMsg = async (req, res) => {
  try {
    if (hasMessagesArray(req.body)) {
      await AnalyzeMessage(req, res);
    }
    res.sendStatus(200);
  } catch (error) {
    logger.error(error);
    res.sendStatus(200);
  }
};

/* ---------------- VERIFY WEBHOOK ---------------- */

export const verifywhatsapp = async (req, res) => {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === 'solarbot'
  ) {
    res.send(req.query['hub.challenge']);
  }
};

/* ---------------- HELPERS ---------------- */

function hasMessagesArray(data) {
  return (
    data.entry &&
    data.entry[0].changes &&
    data.entry[0].changes[0].value &&
    Array.isArray(data.entry[0].changes[0].value.messages)
  );
}
