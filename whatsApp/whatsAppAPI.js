import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

import { logger } from '../utils/logging.js';
import { trimString } from './DFchipsToButtons.js';
import { checkFileAvailability } from '../CloudStorage/checkFileReadyness.js';


async function callWhatsAppAPI(data, phone_number_id) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${phone_number_id}/messages`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WhatsApp_Token}`
        }
      }
    );
    logger.info(`WhatsApp message sent`);
  } catch (error) {
    logger.error(error?.response?.data || error);
  }
}


export async function sendWatsAppReplyText(textResponse, to, phone_number_id) {
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: trimString(textResponse, 4096)
    }
  };

  callWhatsAppAPI(data, phone_number_id);
}


export async function sendWatsAppVideo(to, phone_number_id) {
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "video",
    video: {
      id: "495841383370609",
      caption: "Introduction to EqualJustice.ai"
    }
  };

  callWhatsAppAPI(data, phone_number_id);
}

export async function markAsRead(message_id, phone_number_id) {
  const data = {
    messaging_product: "whatsapp",
    status: "read",
    message_id
  };

  callWhatsAppAPI(data, phone_number_id);
}


export async function getWAMediaURL(mediaId, phone_number_id) {
  const response = await axios.get(
    `https://graph.facebook.com/v20.0/${mediaId}?phone_number_id=${phone_number_id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.WhatsApp_Token}`
      }
    }
  );
  return response.data;
}

export async function downloadWAFile(mediaUrl, filename) {
  const filePath = path.resolve('./CloudStorage', filename);

  const response = await axios.get(mediaUrl, {
    headers: {
      Authorization: `Bearer ${process.env.WhatsApp_Token}`
    },
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}


export async function sendWatsAppWithButtons(textResponse, buttons, footer = '', to, phone_number_id) {
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: trimString(textResponse, 1024) },
      footer: { text: trimString(footer, 60) },
      action: { buttons }
    }
  };

  callWhatsAppAPI(data, phone_number_id);
}


export async function sendWatsAppWithList(textResponse, sections, header = '', footer = '', to, phone_number_id) {
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: trimString(header, 60) },
      body: { text: trimString(textResponse, 4096) },
      footer: { text: trimString(footer, 60) },
      action: sections
    }
  };

  callWhatsAppAPI(data, phone_number_id);
}

export async function sendWhatsAppDocument(filePath, fileName, caption, to, phone_number_id) {
  // Upload document
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("type", "application/pdf");

  const uploadRes = await axios.post(
    `https://graph.facebook.com/v20.0/${phone_number_id}/media`,
    form,
    {
      headers: {
        Authorization: `Bearer ${process.env.WhatsApp_Token}`,
        ...form.getHeaders()
      }
    }
  );

 
  const data = {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: {
      id: uploadRes.data.id,
      caption,
      filename: fileName
    }
  };

  callWhatsAppAPI(data, phone_number_id);
}


export async function sendWhatsAppFileLink(textResponse, file, header = '', footer = '', to, phone_number_id) {
  let counter = 0;
  while (counter < 6) {
    const available = await checkFileAvailability(file.parameters.url);
    if (available) {
      sendWatsAppWithRedirectButton(textResponse, file, header, footer, to, phone_number_id);
      return;
    }
    await new Promise(r => setTimeout(r, 15000));
    counter++;
  }
}
