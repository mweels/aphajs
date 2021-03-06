
import {Repository} from "./Repository";
import {AggregateRoot} from "../Domain/AggregateRoot";
import {AggregateFactory} from "../Domain/AggregateFactory";
import {EventStore} from "../EventStore/EventStore";
import {ClassNameInflector} from "../Inflection/ClassNameInflector";

export class EventSourcingRepository<T extends AggregateRoot> implements Repository<T> {
    constructor(private factory: AggregateFactory<T>, private eventStore: EventStore) {}

    public async findById(id: string): Promise<T> {
        const events = await this.eventStore.getEventsForAggregate(id);
        return this.factory.createAggregate(events);
    }

    public async store(aggregate: AggregateRoot, expectedVersion: number): Promise<void> {
        await this.eventStore.save(
            aggregate.getId(),
            ClassNameInflector.classOf(aggregate),
            aggregate.getUncommittedChanges(),
            expectedVersion
        );

        aggregate.markChangesCommitted();
    }
}
