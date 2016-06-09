
import "reflect-metadata";
import {MetadataKeys} from "../Decorators/MetadataKeys";
import {AnnotatedCommandHandler} from "./AnnotatedCommandHandler";
import {ClassNameInflector} from "../Inflection/ClassNameInflector";
import {DecoratorException} from "../Decorators/DecoratorException";
import {Command, CommandType} from "../Message/Command";
import {UnsupportedCommandException} from "./UnsupportedCommandException";

export type AnnotatedCommandHandlers = {[commandClass: string]: Function};

export namespace CommandHandlerDecorator {
    export const COMMAND_HANDLERS = "annotations:commandhandlers";
}

export function CommandHandler(): Function {
    return (
        target: AnnotatedCommandHandler,
        methodName: string,
        descriptor: TypedPropertyDescriptor<Function>
    ): void => {
        const paramTypes = Reflect.getMetadata(MetadataKeys.PARAM_TYPES, target, methodName);

        if (paramTypes.length === 0) {
            const targetClass = ClassNameInflector.classOf(target);
            throw new DecoratorException(targetClass, methodName, "CommandHandler");
        }

        const handlers: AnnotatedCommandHandlers =
            Reflect.getOwnMetadata(CommandHandlerDecorator.COMMAND_HANDLERS, target) || {};
        const commandType: CommandType = paramTypes[0];
        const commandClass = ClassNameInflector.className(commandType);

        handlers[commandClass] = descriptor.value;
        Reflect.defineMetadata(CommandHandlerDecorator.COMMAND_HANDLERS, handlers, target);

        const types = target.getSupportedCommands();
        types.push(commandType);
        target.getSupportedCommands = (): CommandType[] => {
            return types;
        };
    };
}

export function CommandHandlerDispatcher(): Function {
    return (
        target: AnnotatedCommandHandler,
        methodName: string,
        descriptor: TypedPropertyDescriptor<Function>
    ): void => {
        descriptor.value = function (command: Command) {
            const handlers: AnnotatedCommandHandlers =
                Reflect.getMetadata(CommandHandlerDecorator.COMMAND_HANDLERS, this) || {};
            const commandClass = ClassNameInflector.classOf(command);

            if (!handlers[commandClass]) {
                throw new UnsupportedCommandException(commandClass);
            }

            handlers[commandClass].call(this, command);
        };
    };
}
