
import "reflect-metadata";
import {MetadataKeys} from "../Decorators/MetadataKeys";
import {AnnotatedEventListener} from "./AnnotatedEventListener";
import {DecoratorException} from "../Decorators/DecoratorException";
import {ClassNameInflector} from "../Inflection/ClassNameInflector";
import {Event, EventType} from "../Message/Event";
import {UnsupportedEventException} from "./UnsupportedEventException";

export type AnnotatedEventListeners = {[eventClass: string]: Function};

type EventDescriptor = {
    type: EventType
};

type DeferredEventListener = {
    methodName: string,
    descriptor: TypedPropertyDescriptor<Function>,
    event: EventDescriptor
};

namespace EventListenerDecorator {
    export const EVENT_HANDLERS = "annotations:eventhandlers";
    export const EVENT_TYPES = "annotations:eventtypes";
    export const DEFERRED = "annotations:deferredeventhandlers";
}

export function EventListener(eventDescriptor?: {type: EventType}): Function {
    return (
        target: AnnotatedEventListener,
        methodName: string,
        descriptor: TypedPropertyDescriptor<Function>
    ): void => {
        if (eventDescriptor) {
            const deferred: DeferredEventListener[] =
                Reflect.getMetadata(EventListenerDecorator.DEFERRED, target) || [];
            deferred.push({
                methodName: methodName,
                descriptor: descriptor,
                event: eventDescriptor
            });
            Reflect.defineMetadata(EventListenerDecorator.DEFERRED, deferred, target);
            return;
        }

        const paramTypes = Reflect.getMetadata(MetadataKeys.PARAM_TYPES, target, methodName) || [];

        if (paramTypes.length === 0) {
            const targetClass = ClassNameInflector.classOf(target);
            throw new DecoratorException(targetClass, methodName, "EventListener");
        }

        const eventType: EventType = paramTypes[0];
        const eventClass = ClassNameInflector.className(eventType);

        const handlers: AnnotatedEventListeners =
            Reflect.getOwnMetadata(EventListenerDecorator.EVENT_HANDLERS, target) || {};

        handlers[eventClass] = descriptor.value;
        Reflect.defineMetadata(EventListenerDecorator.EVENT_HANDLERS, handlers, target);

        const types = Reflect.getOwnMetadata(EventListenerDecorator.EVENT_TYPES, target) || [];
        types.push(eventType);
        Reflect.defineMetadata(EventListenerDecorator.EVENT_TYPES, types, target);
    };
}

export function EventListenerDispatcher(): Function {
    return (
        target: AnnotatedEventListener,
        methodName: string,
        descriptor: TypedPropertyDescriptor<Function>
    ): void => {
        descriptor.value = function (event: Event) {
            const handlers: AnnotatedEventListeners =
                Reflect.getMetadata(EventListenerDecorator.EVENT_HANDLERS, this) || {};
            const eventClass = ClassNameInflector.classOf(event);

            if (!handlers[eventClass]) {
                throw new UnsupportedEventException(eventClass);
            }

            handlers[eventClass].call(this, event);
        };
    }
}

export function SupportedEventTypesRetriever(): Function {
    return (
        target: AnnotatedEventListener,
        methodName: string,
        descriptor: TypedPropertyDescriptor<Function>
    ): void => {
        descriptor.value = function (): EventType[] {
            return Reflect.getMetadata(EventListenerDecorator.EVENT_TYPES, this);
        };
    };
}

export function defineDeferredEventListeners(target: AnnotatedEventListener): void {
    const deferred: DeferredEventListener[] = Reflect.getMetadata(EventListenerDecorator.DEFERRED, target) || [];
    deferred.forEach(handler => {
        Reflect.defineMetadata(MetadataKeys.PARAM_TYPES, [handler.event.type], target, handler.methodName);
        EventListener()(target, handler.methodName, handler.descriptor);
    });
    Reflect.defineMetadata(EventListenerDecorator.DEFERRED, [], target);
}
