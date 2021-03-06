
import * as sinon from "sinon";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import {expect} from "chai";
import {EventStore} from "../../../main/Apha/EventStore/EventStore";
import {EventBus} from "../../../main/Apha/EventHandling/EventBus";
import {EventStorage} from "../../../main/Apha/EventStore/Storage/EventStorage";
import {Serializer} from "../../../main/Apha/Serialization/Serializer";
import {EventDescriptor} from "../../../main/Apha/EventStore/EventDescriptor";
import {Event, EventType} from "../../../main/Apha/Message/Event";
import {EventClassMap} from "../../../main/Apha/EventStore/EventClassMap";
import {AggregateNotFoundException} from "../../../main/Apha/EventStore/AggregateNotFoundException";
import {EventListener} from "../../../main/Apha/EventHandling/EventListener";
import {ConcurrencyException} from "../../../main/Apha/EventStore/ConcurrencyException";
import {AnyType} from "../../../main/Inflect";

chai.use(chaiAsPromised);

describe("EventStore", () => {
    let eventStore;
    let serializer;

    let eventBusMock;
    let storageMock;
    let serializerMock;

    beforeEach(() => {
        const eventBus = new EventStoreEventBus();
        const storage = new EventStoreEventStorage();
        serializer = new EventStoreSerializer();

        eventBusMock = sinon.mock(eventBus);
        storageMock = sinon.mock(storage);
        serializerMock = sinon.mock(serializer);

        const events = new Set<EventType>();
        events.add(EventStoreEvent);
        eventStore = new EventStore(eventBus, storage, serializer, new EventClassMap(events));
    });

    describe("getAggregateIds", () => {
        it("retrieves all IDs for all stored aggregates", (done) => {
            storageMock.expects("findIdentities").once();

            eventStore.getAggregateIds().then(() => {
                storageMock.verify();
                done();
            });
        });
    });

    describe("getEventsForAggregate", () => {
        it("retrieves all events for aggregate with given ID", (done) => {
            const aggregateId = "id";
            const event = new EventStoreEvent();
            const descriptors = [
                EventDescriptor.record(
                    aggregateId,
                    "aggregatetype",
                    event.fullyQualifiedName,
                    serializer.serialize(event),
                    1
                )
            ];

            storageMock.expects("contains")
                .once()
                .withArgs(aggregateId)
                .returns(true);

            storageMock.expects("find")
                .once()
                .withArgs(aggregateId)
                .returns(descriptors);

            serializerMock.expects("deserialize")
                .once()
                .returns(event);

            const promisedEvents = eventStore.getEventsForAggregate(aggregateId);

            expect(promisedEvents).to.eventually.have.lengthOf(1).and.notify(() => {
                storageMock.verify();
                storageMock.restore();
                done();
            });
        });

        it("throws exception if aggregate cannot be found", (done) => {
            const aggregateId = "id";

            storageMock.expects("contains")
                .once()
                .withArgs(aggregateId)
                .returns(false);

            expect(eventStore.getEventsForAggregate(aggregateId)).to.be.rejectedWith(AggregateNotFoundException)
                .and.notify(done);
        });
    });

    describe("save", () => {
        it("stores a series of events for a new aggregate to storage", (done) => {
            const aggregateId = "id";
            const aggregateType = "aggregatetype";
            const events = [
                new EventStoreEvent(),
                new EventStoreEvent()
            ];

            storageMock.expects("find")
                .once()
                .withArgs(aggregateId)
                .returns([]);

            storageMock.expects("append")
                .exactly(events.length);

            expect(eventStore.save(aggregateId, aggregateType, events, -1)).to.be.fulfilled.and.notify(() => {
                storageMock.verify();
                done();
            });
        });

        it("stores a series of events for an existing aggregate to storage", (done) => {
            const aggregateId = "id";
            const aggregateType = "aggregatetype";

            const firstEvent = new EventStoreEvent();
            firstEvent.version = 1;
            const secondEvent = new EventStoreEvent();
            secondEvent.version = 2;

            const history = [firstEvent, secondEvent];
            const events = [
                new EventStoreEvent(),
                new EventStoreEvent()
            ];

            storageMock.expects("find")
                .once()
                .withArgs(aggregateId)
                .returns(
                    history.map((event: Event) => {
                        return EventDescriptor.record(
                            aggregateId,
                            aggregateType,
                            event.fullyQualifiedName,
                            serializer.serialize(event),
                            event.version
                        );
                    }
                ));

            storageMock.expects("append")
                .exactly(events.length);

            expect(eventStore.save(aggregateId, aggregateType, events, 2)).to.be.fulfilled.and.notify(() => {
                storageMock.verify();
                done();
            });
        });

        it("throws exception if expected playhead is invalid", (done) => {
            const aggregateId = "id";
            const aggregateType = "aggregatetype";

            storageMock.expects("find")
                .once()
                .withArgs(aggregateId)
                .returns([]);

            expect(eventStore.save(aggregateId, aggregateType, [], 1)).to.be.rejectedWith(ConcurrencyException)
                .and.notify(done);
        });
    });

    describe("clear", () => {
        it("should clear the storage", (done) => {
            storageMock.expects("clear")
                .once();

            expect(eventStore.clear()).to.be.fulfilled.and.notify(() => {
                storageMock.verify();
                done();
            });
        });
    });
});

class EventStoreEvent extends Event {
}

class EventStoreEventStorage implements EventStorage {
    public async contains(id: string): Promise<boolean> {
        return false;
    }

    public async append(event: EventDescriptor): Promise<boolean> {
        return false;
    }

    public async find(id: string): Promise<EventDescriptor[]> {
        return [];
    }

    public async findIdentities(): Promise<Set<string>> {
        return new Set<string>();
    }

    public async clear(): Promise<void> {
    }
}

class EventStoreSerializer implements Serializer {
    public serialize(value: any): string {
        return "";
    }

    public deserialize(data: string, type: AnyType): any {
        return null;
    }
}

class EventStoreEventBus extends EventBus {
    public subscribe(listener: EventListener, eventType?: EventType): void {
    }

    public unsubscribe(listener: EventListener, eventType: EventType): void {
    }

    public publish(event: Event): boolean {
        return false;
    }
}
