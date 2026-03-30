# Tech-Discussion.io - Tech. Community App

A real-time chat application built with **Express.js**, **Web-Socket.io**, and **Mongoose**. It's an microservice for [Tech-Community-App](https://github.com/YUGESHKARAN/Tech-Community-App.git), which allows users to participate in live chat discussions and share thoughts about the tech content.

## Features
 
- **Real-Time Chat:** Integrated to [Tech-Community-App](https://github.com/YUGESHKARAN/Tech-Community-App.git) for live descussions without refreshing the page.
- **Content Control:** Users can edit or delete their posted comment. 
- **User-Friendly Interface:** Simple and intuitive UI for chatting.

## Technologies Used 

- [Express.js](https://expressjs.com/) – Backend web framework
- [Tech-Discussion.io](https://socket.io/) – Real-time communication
- [Mongoose](https://mongoosejs.com/) – MongoDB object modeling
- [MongoDB](https://www.mongodb.com/) – Database

## Getting Started 

### Prerequisites

- [Node.js](https://nodejs.org/) 
- [MongoDB](https://www.mongodb.com/) 

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YUGESHKARAN/Tech-Discussion.io.git
   cd Tech-Discussion.io
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env` file in the root directory.
   - Add your MongoDB connection string and any necessary configuration.

4. **Start the application:**
   ```bash
   npm run dev
   ```
   The application will typically run on `http://localhost:4000`.



## Contributing 

Contributions are welcome! Please fork the repository and submit a pull request for review.

## License

This project is licensed under the MIT License.

---
