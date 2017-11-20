export const Algorithms = new Meteor.Collection("Algorithms");

AlgorithmsSchema = new SimpleSchema({
    type: {
        type: String
    },
    name: {
        type: String
    }
})

Algorithms.attachSchema(AlgorithmsSchema)