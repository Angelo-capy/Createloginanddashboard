import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-22886cdc/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-22886cdc/signup", async (c) => {
  try {
    const { username, email, password } = await c.req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store username mapping in kv_store for login by username
    await kv.set(`username:${username.toLowerCase()}`, { email });

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Unexpected error during signup: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get email by username endpoint
app.post("/make-server-22886cdc/get-email-by-username", async (c) => {
  try {
    const { username } = await c.req.json();

    if (!username) {
      return c.json({ error: 'Username is required' }, 400);
    }

    const userData = await kv.get(`username:${username.toLowerCase()}`);

    if (!userData || !userData.email) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    return c.json({ email: userData.email });
  } catch (error) {
    console.log(`Error getting email by username: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get tasks for authenticated user
app.get("/make-server-22886cdc/tasks", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tasks = await kv.getByPrefix(`task:${user.id}:`);
    return c.json({ tasks: tasks || [] });
  } catch (error) {
    console.log(`Error fetching tasks: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Create task for authenticated user
app.post("/make-server-22886cdc/tasks", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { title, description, dueDate, dueTime, priority, deadline } = await c.req.json();
    const taskId = crypto.randomUUID();
    const task = {
      id: taskId,
      title,
      description,
      status: 'pending',
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiry_date: dueDate || null,
      expiry_time: dueTime || null,
      priority: priority || 'media',
      deadline: deadline || null
    };

    await kv.set(`task:${user.id}:${taskId}`, task);
    return c.json({ task });
  } catch (error) {
    console.log(`Error creating task: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Update task status for authenticated user
app.put("/make-server-22886cdc/tasks/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const taskId = c.req.param('id');
    const { status } = await c.req.json();

    const existingTask = await kv.get(`task:${user.id}:${taskId}`);
    if (!existingTask) {
      return c.json({ error: 'Task not found' }, 404);
    }

    const updatedTask = {
      ...existingTask,
      status,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`task:${user.id}:${taskId}`, updatedTask);
    return c.json({ task: updatedTask });
  } catch (error) {
    console.log(`Error updating task: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete task for authenticated user
app.delete("/make-server-22886cdc/tasks/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const taskId = c.req.param('id');
    await kv.del(`task:${user.id}:${taskId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting task: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);