import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import { checkAndRunMigrations } from "$lib/migrations/migrations";
import { AbortedGenerations } from "$lib/server/abortedGenerations";
import { findUser, refreshSessionCookie } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import { initExitHandler } from "$lib/server/exitHandler";
import { logger } from "$lib/server/logger";
import { MetricsServer } from "$lib/server/metrics";
import { sha256 } from "$lib/utils/sha256";
import type { Handle, HandleServerError } from "@sveltejs/kit";
import { addWeeks } from "date-fns";

// TODO: move this code on a started server hook, instead of using a "building" flag
if (!building) {
	// Set HF_TOKEN as a process variable for Transformers.JS to see it
	process.env.HF_TOKEN ??= env.HF_TOKEN;

	logger.info("Starting server...");
	initExitHandler();

	checkAndRunMigrations();
	// Init metrics server
	MetricsServer.getInstance();

	// Init AbortedGenerations refresh process
	AbortedGenerations.getInstance();
}

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	// handle 404

	if (building) {
		throw error;
	}

	if (event.route.id === null) {
		return {
			message: `Page ${event.url.pathname} not found`,
		};
	}

	const errorId = crypto.randomUUID();

	logger.error({
		locals: event.locals,
		url: event.request.url,
		params: event.params,
		request: event.request,
		message,
		error,
		errorId,
		status,
		stack: error instanceof Error ? error.stack : undefined,
	});

	return {
		message: "An error occurred",
		errorId,
	};
};

export const handle: Handle = async ({ event, resolve }) => {
	console.log("event.url.pathname log==>", event.url.pathname + "=====id:" + event.route.id);
	logger.debug({
		locals: event.locals,
		url: event.url.pathname,
		params: event.params,
		request: event.request,
	});

	function errorResponse(status: number, message: string) {
		const sendJson =
			event.request.headers.get("accept")?.includes("application/json") ||
			event.request.headers.get("content-type")?.includes("application/json");
		return new Response(sendJson ? JSON.stringify({ error: message }) : message, {
			status,
			headers: {
				"content-type": sendJson ? "application/json" : "text/plain",
			},
		});
	}
	let secretSessionId: string | null = null;
	let sessionId: string | null = null;

	const token = event.cookies.get(env.COOKIE_NAME);

	if (token) {
		secretSessionId = token;
		sessionId = await sha256(token);
		const user = await findUser(sessionId);

		if (user) {
			event.locals.user = user;
		}
	}
	if (!sessionId || !secretSessionId) {
		secretSessionId = crypto.randomUUID();
		sessionId = await sha256(secretSessionId);

		if (await collections.sessions.findOne({ sessionId })) {
			return errorResponse(500, "Session ID collision");
		}
	}

	event.locals.sessionId = sessionId;

	if (event.request.method === "POST") {
		// if the request is a POST request we refresh the cookie
		refreshSessionCookie(event.cookies, secretSessionId);

		await collections.sessions.updateOne(
			{ sessionId },
			{ $set: { updatedAt: new Date(), expiresAt: addWeeks(new Date(), 2) } }
		);
	}
	return resolve(event);
};
