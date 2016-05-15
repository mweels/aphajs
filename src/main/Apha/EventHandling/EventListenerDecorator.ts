
import "reflect-metadata";
import {MetadataKeys} from "../Decorators/MetadataKeys";
import {AnnotatedEventListener} from "./AnnotatedEventListener";
import {DecoratorException} from "../Decorators/DecoratorException";
import {ClassNameInflector} from "../Inflection/ClassNameInflector";
import {Event} from "../Message/Event";
import {UnsupportedEventException} from "./UnsupportedEventException";

export type AnnotatedEventListeners = {[eventClass: string]: Function};

export namespace EventListenerDecorator {
    export const EVENT_HANDLERS = "annotations:eventhandlers";
}

export function EventListener(
    target: AnnotatedEventListener,
    methodName: string,
    descriptor: TypedPropertyDescriptor<Function>
): void {
    let paramTypes = Reflect.getMetadata(MetadataKeys.PARAM_TYPES, target, methodName);

    if (paramTypes.length === 0) {
        let targetClass = ClassNameInflector.classOf(target);
        throw new DecoratorException(targetClass, methodName, "EventListener");
    }

    let handlers: AnnotatedEventListeners = Reflect.getMetadata(EventListenerDecorator.EVENT_HANDLERS, target) || {};
    let eventClass = ClassNameInflector.className(paramTypes[0]);

    handlers[eventClass] = descriptor.value;
    Reflect.defineMetadata(EventListenerDecorator.EVENT_HANDLERS, handlers, target);
}

export function EventListenerDispatcher(
    target: AnnotatedEventListener,
    methodName: string,
    descriptor: TypedPropertyDescriptor<Function>
): void {
    descriptor.value = function (event: Event) {
        let handlers: AnnotatedEventListeners = Reflect.getMetadata(EventListenerDecorator.EVENT_HANDLERS, this) || {};
        let eventClass = ClassNameInflector.classOf(event);

        if (!handlers[eventClass]) {
            throw new UnsupportedEventException(eventClass);
        }

        handlers[eventClass].call(this, event);
    };
}