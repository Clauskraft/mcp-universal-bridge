# 🌊 DigitalOcean Konto Oprettelse - Komplet Guide

## ✅ Forudsætninger
- Google konto
- Kreditkort eller PayPal (~$5 verification deposit, refunderes)
- 10-15 minutter

---

## 📋 STEP 1: Sign Up med Google

### 1.1 Åbn DigitalOcean
**URL:** https://cloud.digitalocean.com/registrations/new

### 1.2 Klik "Sign up with Google"
- Find den **blå knap** med Google logo
- Tekst: "Sign up with Google"
- Klik på knappen

### 1.3 Vælg Google Konto
- Vælg din Google konto fra listen
- Eller log ind med Google email + password

### 1.4 Godkend Adgang
- DigitalOcean vil bede om tilladelse til:
  - Se din email addresse
  - Se dit profilinfo
- Klik **"Allow"** eller **"Tillad"**

---

## 📋 STEP 2: Udfyld Profil

### 2.1 Welcome Screen
Efter Google login ser du "Welcome to DigitalOcean"

**Udfyld:**
- **Full Name:** (auto-udfyldt fra Google)
- **Email:** (auto-udfyldt fra Google)
- **Company Name:** (OPTIONAL - kan bare være dit navn eller "Personal")

### 2.2 Purpose
**"What will you use DigitalOcean for?"**
- Vælg: **"Business or Commercial purposes"**
- Eller: **"Personal project"**

### 2.3 Create Account
- Klik **"Get Started"** eller **"Create Account"**

---

## 📋 STEP 3: Email Verification

### 3.1 Check Email
- Gå til din Gmail inbox
- Find email fra **"DigitalOcean" <noreply@digitalocean.com>**
- Subject: "Verify your DigitalOcean account"

### 3.2 Verify Email
- Åbn emailen
- Klik på **"Verify Email Address"** knappen
- Dette åbner en ny browser tab

### 3.3 Bekræftelse
- Du skal se "Email verified successfully!"
- Klik **"Continue to DigitalOcean"**

---

## 📋 STEP 4: Tilføj Betalingsmetode

### 4.1 Payment Method Screen
Du skal nu se "Add a payment method"

**Options:**
- **Credit Card** (anbefalet - øjeblikkeligt)
- **PayPal**

### 4.2 Vælg Credit Card

**Udfyld:**
- **Card Number:** 16 cifre (ingen mellemrum)
- **Expiry Date:** MM/YY format
- **CVV:** 3 cifre på bagsiden af kort
- **Cardholder Name:** Navn som på kort
- **Billing Address:**
  - Address line 1
  - City
  - Postal Code
  - Country: Denmark

### 4.3 Verification Deposit
**VIGTIGT:**
- DigitalOcean trækker **$5-10** for verification
- Dette er **IKKE** betaling - det refunderes indenfor 7 dage
- Check med din bank at international payments er aktiveret

### 4.4 Save Payment Method
- Review informationen
- Klik **"Save Payment Method"**
- Vent 5-10 sekunder mens det processeres

### 4.5 Success!
Du skal nu se DigitalOcean dashboard med:
- "Welcome to DigitalOcean" banner
- Green checkmark ved payment method

---

## 📋 STEP 5: Opret Droplet

### 5.1 Access Droplet Creation
**Option A:**
- Klik på **"Create"** knappen (øverst til højre)
- Vælg **"Droplets"** fra dropdown

**Option B:**
- Klik på **"Get Started with a Droplet"** link
- Eller **"Create Droplet"** knap

### 5.2 Choose Image
**Section: Choose an image**

1. **Distribution:** Vælg **"Ubuntu"**
2. **Version:** Vælg **"22.04 (LTS) x64"**
   - LTS = Long Term Support (anbefalet)

### 5.3 Choose Plan
**Section: Choose a plan**

1. **Droplet Type:** Vælg **"Basic"** (venstre side)
2. **CPU Options:** Vælg **"Regular"**
3. **Select Plan:**
   - Find **$12/mo** planen
   - Specifikationer:
     - **2 GB** RAM / **1** vCPU
     - **50 GB** SSD Disk
     - **2 TB** Transfer
   - Klik på denne plan (bliver highlighted når valgt)

### 5.4 Choose Region
**Section: Choose a datacenter region**

**Anbefalet for Danmark:**
- **Frankfurt, Germany** (FRA1)
- Eller **Amsterdam, Netherlands** (AMS3)

**Hvorfor:**
- Tættest på Danmark = hurtigst
- Low latency (~10-20ms)
- EU GDPR compliance

**Undgå:**
- US regions (høj latency)
- Asian regions (meget høj latency)

### 5.5 Authentication Method
**Section: Authentication**

**Option 1: Password (NEMMEST)**
1. Vælg **"Password"** radio button
2. **Enter root password:**
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, symbols
   - Eksempel: `MySecure123!Pass`
3. **IMPORTANT:** GEM dette password - du skal bruge det senere!

**Option 2: SSH Key (Avanceret)**
- Kun hvis du har en SSH key
- Ellers brug Password

### 5.6 Finalize Details
**Section: Finalize and create**

1. **How many Droplets:**
   - Lad stå på **1 Droplet**

2. **Choose a hostname:**
   - Standard: `ubuntu-s-2vcpu-2gb-fra1-01`
   - **ANBEFALING:** Skift til: **`mcp-bridge-prod`**
   - Gør det nemmere at identificere senere

3. **Select project:**
   - Lad stå på **"default"**
   - Eller opret nyt projekt hvis du vil

4. **Tags:** (OPTIONAL)
   - Du kan tilføje tags som: `production`, `mcp-bridge`
   - Nyttigt til organisering

5. **Backups:** (OPTIONAL)
   - Koster extra $2.40/mo (20% af droplet pris)
   - Du kan tilføje det senere hvis nødvendigt
   - **ANBEFALING:** Start uden, tilføj senere hvis nødvendigt

### 5.7 Create Droplet
**IMPORTANT: Check alt er korrekt!**

**Verify:**
- ✅ Image: Ubuntu 22.04 LTS x64
- ✅ Plan: $12/mo (2 GB RAM, 1 vCPU)
- ✅ Region: Frankfurt eller Amsterdam
- ✅ Authentication: Password sat
- ✅ Hostname: mcp-bridge-prod

**Create:**
- Klik den store grønne **"Create Droplet"** knap nederst
- Cost shown: **$0.018/hour** eller **$12/mo**

### 5.8 Wait for Creation
- Du ser nu en progress bar: "Creating your Droplet..."
- Dette tager **30-90 sekunder**
- Status updates:
  - "Setting up networking..."
  - "Configuring operating system..."
  - "Droplet is now active!"

---

## 📋 STEP 6: Find Din Droplet IP

### 6.1 Droplet Dashboard
Efter creation er færdig:
- Du er automatisk på Droplets page
- Ser en liste med dine droplets

### 6.2 Find IP Address
**Din droplet info viser:**
- **Name:** mcp-bridge-prod
- **IP Address:** `XXX.XXX.XXX.XXX` (4 tal separeret med punktum)
- **Region:** FRA1 eller AMS3
- **Status:** Green dot + "Active"

### 6.3 Copy IP Address
**Metode 1: Click to Copy**
- Klik direkte på IP addressen
- Det kopieres automatisk til clipboard

**Metode 2: Manual Copy**
- Select IP med musen
- Right click → Copy
- Eller Ctrl+C

### 6.4 IMPORTANT: Gem Information
**Gem følgende information sikkert:**
```
Droplet Name: mcp-bridge-prod
IP Address: XXX.XXX.XXX.XXX
Root Password: (det password du satte)
Region: FRA1
```

---

## ✅ STEP 7: Verification

### 7.1 Test SSH Connection (Optional men anbefalet)
**Fra Windows PowerShell:**
```powershell
ssh root@YOUR_DROPLET_IP
```

**Første gang:**
- Du får spørgsmål: "Are you sure you want to continue connecting?"
- Skriv: `yes` og tryk Enter
- Indtast dit root password
- Du skal nu se: `root@mcp-bridge-prod:~#`

**Success!** Du er connected til din server!

**Exit:**
```bash
exit
```

---

## 🎉 COMPLETED! Du Har Nu:

✅ **DigitalOcean Account:** Aktiveret og verified
✅ **Payment Method:** Kreditkort tilføjet
✅ **Droplet:** Ubuntu 22.04 server kørende
✅ **IP Address:** Din server's public IP
✅ **SSH Access:** Root access til serveren

---

## 📋 NEXT STEPS: Deployment

**Du har nu alt du skal bruge til deployment!**

**Send mig følgende information:**
1. ✅ Droplet IP address: `XXX.XXX.XXX.XXX`
2. ✅ Root password: (jeg skal bruge det til SSH)
3. ✅ Vil du bruge et domain navn? (ja/nej)
   - Hvis ja: hvilket domain?

**Så kører jeg automated deployment:**
- Install Node.js, PM2, Nginx
- Clone mcp-bridge repository
- Configure production environment
- Start application
- Setup SSL (hvis domain)
- Test API endpoints

**Estimated time: 5-10 minutter** 🚀

---

## 🆘 Troubleshooting

### Problem: "Payment method declined"
**Solution:**
- Check dit kreditkort tillader international payments
- Prøv PayPal i stedet
- Contact din bank for at aktivere international payments
- Ensure sufficient funds (mindst $15)

### Problem: "Email ikke modtaget"
**Solution:**
- Check spam folder
- Check "Promotions" tab i Gmail
- Wait 5 minutter og check igen
- Resend verification email fra DigitalOcean

### Problem: "Droplet creation failed"
**Solution:**
- Refresh siden og prøv igen
- Vælg en anden region
- Contact DigitalOcean support (chat i højre hjørne)

### Problem: "Cannot SSH to droplet"
**Solution:**
- Wait 2-3 minutter efter droplet creation
- Check firewall ikke blokerer port 22
- Verify IP address er korrekt
- Verify password er korrekt (case sensitive!)

---

## 💰 Cost Summary

**Immediate Costs:**
- Verification deposit: **$5-10** (refunderes)

**Monthly Costs:**
- Droplet: **$12/month** (~90 DKK)
- Bandwidth: Included (2 TB)
- Total: **$12/month** (~90 DKK)

**Optional Add-ons:**
- Backups: +$2.40/mo
- Domain: ~$12/year (~90 DKK/år)
- SSL: FREE (Let's Encrypt)

---

## 📞 Support

**DigitalOcean Support:**
- Live Chat: Click chat icon i højre hjørne af dashboard
- Docs: https://docs.digitalocean.com
- Community: https://www.digitalocean.com/community

**For Deployment Help:**
- Send mig droplet IP når klar
- Jeg guider dig gennem automated deployment
- Full support gennem hele processen

**HELD OG LYKKE! 🚀**
