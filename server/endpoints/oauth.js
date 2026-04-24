const { User } = require("../models/user");
const { TemporaryAuthToken } = require("../models/temporaryAuthToken");
const crypto = require("crypto");

function oauthEndpoints(app, apiRouter) {
  if (!app) return;

  // 1. Redirect to Azure AD Login
  apiRouter.get("/auth/azure", (req, res) => {
    if (
      !process.env.AZURE_AD_CLIENT_ID ||
      !process.env.AZURE_AD_TENANT_ID ||
      !process.env.AZURE_AD_REDIRECT_URI
    ) {
      return res.status(500).send("Azure AD configuration is missing.");
    }

    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.AZURE_AD_REDIRECT_URI,
      response_mode: "query",
      scope: "User.Read",
      state: crypto.randomBytes(16).toString("hex"), // CSRF protection
    });

    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
    res.redirect(url);
  });

  // 2. Handle Callback from Azure AD
  apiRouter.get("/auth/azure/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID,
            scope: "User.Read",
            code,
            redirect_uri: process.env.AZURE_AD_REDIRECT_URI,
            grant_type: "authorization_code",
            client_secret: process.env.AZURE_AD_CLIENT_SECRET,
          }),
        }
      );

      const tokenData = await tokenResponse.json();
      if (tokenData.error)
        throw new Error(
          tokenData.error_description || JSON.stringify(tokenData)
        );

      // Get user profile from Microsoft Graph
      const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json();

      // Use email or UPN as username. Lowercased because the User model's
      // username regex only allows lowercase, and Azure AD preserves the
      // original casing of emails/UPNs across tenants.
      const rawEmail = userData.mail || userData.userPrincipalName;
      if (!rawEmail) throw new Error("Could not retrieve email from Azure AD");
      const email = String(rawEmail).toLowerCase();

      // Determine Role
      let role = "default";

      // 1. Check Admin Email
      console.log("user_email", email);
      console.log("AZURE_AD_ADMIN_EMAIL", process.env.AZURE_AD_ADMIN_EMAIL);
      if (
        process.env.AZURE_AD_ADMIN_EMAIL &&
        email.toLowerCase() === process.env.AZURE_AD_ADMIN_EMAIL.toLowerCase()
      ) {
        role = "admin";
      }

      console.log("role", role);

      // 2. Check Group Mapping (Optional)
      if (process.env.AZURE_AD_ROLE_MAP) {
        try {
          const roleMap = JSON.parse(process.env.AZURE_AD_ROLE_MAP);
          const groupsResponse = await fetch(
            "https://graph.microsoft.com/v1.0/me/memberOf",
            {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            }
          );
          const groupsData = await groupsResponse.json();

          console.log("user_groupsData", groupsData);

          if (groupsData.value) {
            const userGroupIds = groupsData.value.map((g) => g.id);
            const userGroupNames = groupsData.value.map((g) => g.displayName);

            // Check for matches
            for (const [group, mappedRole] of Object.entries(roleMap)) {
              if (
                userGroupIds.includes(group) ||
                userGroupNames.includes(group)
              ) {
                // Upgrade role if higher privilege found (simple hierarchy check)
                if (mappedRole === "admin") role = "admin";
                else if (mappedRole === "manager" && role !== "admin")
                  role = "manager";
              }
            }
          }
        } catch (e) {
          console.error("Error processing Azure AD Group Mapping:", e);
        }
      }

      // Find or create user in AnythingLLM
      let user = await User._get({ username: email });

      if (!user) {
        // Generate a strong random password for the SSO user
        const randomPassword =
          crypto.randomBytes(20).toString("base64") + "A1!";
        const { user: newUser, error } = await User.create({
          username: email,
          password: randomPassword,
          role,
        });
        if (error) throw new Error(`Failed to create user: ${error}`);
        user = newUser;
      } else {
        // Update role if it changed and is higher than current?
        // We enforce the role if it was determined by Admin Email or Group Map
        if (role !== "default" && user.role !== role) {
          await User.update(user.id, { role });
          user.role = role;
        }
      }

      // Issue temporary auth token for frontend login
      const { token, error } = await TemporaryAuthToken.issue(user.id);
      if (error) throw new Error(error);

      // Redirect to frontend SSO handler
      // In dev, frontend is on port 3000. In prod, it's served by the server.
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/sso/simple?token=${token}`);
    } catch (e) {
      console.error("Azure Auth Error:", e);
      res.status(500).send(`Authentication failed: ${e.message}`);
    }
  });
}

module.exports = { oauthEndpoints };
