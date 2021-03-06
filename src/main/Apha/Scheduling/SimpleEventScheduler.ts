
import {EventScheduler, TimeUnit} from "./EventScheduler";
import {ScheduleStorage, ScheduledEvent} from "./Storage/ScheduleStorage";
import {EventBus} from "../EventHandling/EventBus";
import {ScheduleToken} from "./ScheduleToken";
import {Event} from "../Message/Event";
import {IdentityProvider} from "../Domain/IdentityProvider";

type Schedule = {[token: string]: any};

export class SimpleEventScheduler implements EventScheduler {
    private static MAX_TIMEOUT = 2147483647;
    private static REFRESH_TIMEOUT = 864000000;

    private refresh = null;
    private currentSchedule: Schedule = {};

    constructor(private storage: ScheduleStorage, private eventBus: EventBus) {}

    public destroy() {
        clearTimeout(this.refresh);
    }

    public schedule(): void {
        this.scheduleStoredEvents(this);
    }

    private scheduleStoredEvents(sender: SimpleEventScheduler): void {
        for (const scheduledEvent of sender.storage.findAll()) {
            if (sender.currentSchedule[scheduledEvent.token]) {
                continue;
            }

            const timeout = scheduledEvent.timestamp - Date.now();
            sender.currentSchedule[scheduledEvent.token] =
                setTimeout(sender.onTimeout, timeout, sender, scheduledEvent);
        }

        this.refresh = setTimeout(sender.scheduleStoredEvents, SimpleEventScheduler.REFRESH_TIMEOUT, sender);
    }

    public cancelSchedule(token: ScheduleToken): void {
        this.storage.remove(token.getToken());

        if (this.currentSchedule[token.getToken()]) {
            clearTimeout(this.currentSchedule[token.getToken()]);
            delete this.currentSchedule[token.getToken()];
        }
    }

    public scheduleAt(dateTime: Date, event: Event): ScheduleToken {
        const timeout = dateTime.getTime() - Date.now();
        return this.scheduleAfter(timeout, event, TimeUnit.Milliseconds);
    }

    public scheduleAfter(timeout: number, event: Event, timeUnit: TimeUnit = TimeUnit.Milliseconds): ScheduleToken {
        const timeoutMs = this.toMillis(timeout, timeUnit);

        const token = new ScheduleToken(IdentityProvider.generateNew());
        const scheduled = {
            token: token.getToken(),
            event: event,
            timestamp: (Date.now() + timeoutMs)
        };

        this.storage.add(scheduled);

        if (timeoutMs < 0) {
            this.onTimeout(this, scheduled);
        }
        else if (timeoutMs < SimpleEventScheduler.MAX_TIMEOUT) {
            this.currentSchedule[scheduled.token] = setTimeout(this.onTimeout, timeoutMs, this, scheduled);
        }

        return token;
    }

    private onTimeout(sender: SimpleEventScheduler, scheduled: ScheduledEvent): void {
        delete sender.currentSchedule[scheduled.token];
        sender.storage.remove(scheduled.token);
        sender.eventBus.publish(scheduled.event);
    }

    private toMillis(timeout: number, unit: TimeUnit): number {
        switch (unit) {
            case TimeUnit.Hours:
                return timeout * 3600000;

            case TimeUnit.Minutes:
                return timeout * 60000;

            case TimeUnit.Seconds:
                return timeout * 1000;

            case TimeUnit.Milliseconds:
            default:
                return timeout;
        }
    }
}
